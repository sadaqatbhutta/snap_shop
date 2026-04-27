import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Business } from '../../../shared/types';
import { LayoutSkeleton } from '../components/Skeleton';

interface BusinessContextValue {
  business: Business | null;
  businessId: string | null;
  loading: boolean;
  refreshBusiness: () => Promise<void>;
  dataStatus: 'healthy' | 'degraded';
  lastError: string | null;
}

const BusinessContext = createContext<BusinessContextValue>({
  business: null,
  businessId: null,
  loading: true,
  refreshBusiness: async () => {},
  dataStatus: 'healthy',
  lastError: null,
});

const FIRESTORE_BOOTSTRAP_TIMEOUT_MS = 10000;
const RETRY_WINDOW_MS = 15000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataStatus, setDataStatus] = useState<'healthy' | 'degraded'>('healthy');
  const [lastError, setLastError] = useState<string | null>(null);
  const hasBootstrappedRef = useRef(false);
  const inFlightLoadRef = useRef<Promise<void> | null>(null);
  const lastLoadAttemptAtRef = useRef(0);

  const buildFallbackBusiness = useCallback((user: NonNullable<typeof auth.currentUser>): Business => ({
    id: user.uid,
    name: user.displayName?.trim() || 'My Business',
    description: '',
    aiContext: 'We are a business that helps customers with their needs.',
    faqs: [],
    ownerEmail: user.email ?? '',
    createdAt: new Date().toISOString(),
    confidenceThreshold: 0.7,
    onboarding: {
      faqsAdded: false,
      aiContextFilled: false,
      teamInvited: false,
      channelReviewed: false,
      firstTestChat: false,
    },
    aiMacros: [],
  }), []);

  const loadBusiness = useCallback(async (opts?: { forceLoading?: boolean }) => {
    if (inFlightLoadRef.current) {
      return inFlightLoadRef.current;
    }

    const now = Date.now();
    if (hasBootstrappedRef.current && now - lastLoadAttemptAtRef.current < RETRY_WINDOW_MS && business) {
      if (dataStatus === 'degraded') {
        setDataStatus('healthy');
        setLastError(null);
      }
      return;
    }

    const shouldBlockUi = opts?.forceLoading ?? !hasBootstrappedRef.current;
    if (shouldBlockUi) {
      setLoading(true);
    }
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    // Render app shell immediately with optimistic business data, then hydrate from Firestore.
    if (shouldBlockUi && !business) {
      setBusiness(buildFallbackBusiness(user));
      setLoading(false);
    }

    const run = (async () => {
      try {
        lastLoadAttemptAtRef.current = Date.now();
      const bizRef = doc(db, 'businesses', user.uid);
      const bizSnap = await withTimeout(getDoc(bizRef), FIRESTORE_BOOTSTRAP_TIMEOUT_MS, 'Business fetch');

      if (bizSnap.exists()) {
        setBusiness({ ...(bizSnap.data() as Omit<Business, 'id'>), id: bizSnap.id });
        setDataStatus('healthy');
        setLastError(null);
      } else {
        const newBusiness = buildFallbackBusiness(user);
        try {
          await withTimeout(setDoc(bizRef, newBusiness), FIRESTORE_BOOTSTRAP_TIMEOUT_MS, 'Business create');
          setBusiness(newBusiness);
          setDataStatus('healthy');
          setLastError(null);
        } catch (writeErr) {
          console.warn('Could not create business in Firestore:', writeErr);
          setBusiness(newBusiness);
          setDataStatus('degraded');
          setLastError(writeErr instanceof Error ? writeErr.message : 'Unable to persist business document.');
        }
      }
      } catch (err) {
        console.warn('BusinessContext warning:', err);
        const currentUser = auth.currentUser;
        if (currentUser && !business) {
          setBusiness(buildFallbackBusiness(currentUser));
        }
        const message = err instanceof Error ? err.message : 'Business data load failed.';
        const isTimeout = message.toLowerCase().includes('timed out');

        // Keep the app usable with optimistic data if Firestore reads are slow/unreliable.
        if (isTimeout && currentUser) {
          setDataStatus('healthy');
          setLastError(null);
        } else if (business || currentUser) {
          setDataStatus('degraded');
          setLastError(message);
        } else {
          setDataStatus('degraded');
          setLastError(message);
        }
      } finally {
        hasBootstrappedRef.current = true;
        if (shouldBlockUi) {
          setLoading(false);
        }
        inFlightLoadRef.current = null;
      }
    })();

    inFlightLoadRef.current = run;
    return run;
  }, [business, buildFallbackBusiness, dataStatus]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) {
        void loadBusiness({ forceLoading: !hasBootstrappedRef.current });
      } else {
        hasBootstrappedRef.current = false;
        inFlightLoadRef.current = null;
        setBusiness(null);
        setDataStatus('healthy');
        setLastError(null);
        setLoading(false);
      }
    });
    return unsub;
  }, [loadBusiness]);

  const value = useMemo(
    () => ({
      business,
      businessId: business?.id ?? auth.currentUser?.uid ?? null,
      loading,
      refreshBusiness: () => loadBusiness({ forceLoading: false }),
      dataStatus,
      lastError,
    }),
    [business, loading, loadBusiness, dataStatus, lastError],
  );

  if (loading && !business) {
    return <LayoutSkeleton />;
  }

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
}

export const useBusiness = () => useContext(BusinessContext);
