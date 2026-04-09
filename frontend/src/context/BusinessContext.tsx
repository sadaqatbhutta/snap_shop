import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Business } from '../../../shared/types';
import { LayoutSkeleton } from '../components/Skeleton';

interface BusinessContextValue {
  business: Business | null;
  businessId: string | null;
  loading: boolean;
  refreshBusiness: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextValue>({
  business: null,
  businessId: null,
  loading: true,
  refreshBusiness: async () => {},
});

const FIRESTORE_BOOTSTRAP_TIMEOUT_MS = 8000;

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

  const loadBusiness = useCallback(async () => {
    setLoading(true);
    const user = auth.currentUser;
    if (!user) { setLoading(false); return; }

    try {
      const bizRef = doc(db, 'businesses', user.uid);
      const bizSnap = await withTimeout(getDoc(bizRef), FIRESTORE_BOOTSTRAP_TIMEOUT_MS, 'Business fetch');

      if (bizSnap.exists()) {
        setBusiness({ ...(bizSnap.data() as Omit<Business, 'id'>), id: bizSnap.id });
      } else {
        const newBusiness: Business = {
          id: user.uid,
          name: user.displayName?.trim() || 'My Business',
          description: '',
          aiContext: 'We are a business that helps customers with their needs.',
          faqs: [],
          ownerEmail: user.email ?? '',
          createdAt: new Date().toISOString(),
          confidenceThreshold: 0.7,
        };
        try {
          await withTimeout(setDoc(bizRef, newBusiness), FIRESTORE_BOOTSTRAP_TIMEOUT_MS, 'Business create');
          setBusiness(newBusiness);
        } catch (writeErr) {
          console.warn('Could not create business in Firestore:', writeErr);
          setBusiness(newBusiness);
        }
      }
    } catch (err) {
      console.error('BusinessContext error:', err);
      const user = auth.currentUser;
      if (user) {
        const defaultBusiness: Business = {
          id: user.uid,
          name: user.displayName?.trim() || 'My Business',
          description: '',
          aiContext: 'We are a business that helps customers with their needs.',
          faqs: [],
          ownerEmail: user.email ?? '',
          createdAt: new Date().toISOString(),
          confidenceThreshold: 0.7,
        };
        setBusiness(defaultBusiness);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) loadBusiness();
      else { setBusiness(null); setLoading(false); }
    });
    return unsub;
  }, [loadBusiness]);

  const value = useMemo(
    () => ({ business, businessId: business?.id ?? null, loading, refreshBusiness: loadBusiness }),
    [business, loading, loadBusiness],
  );

  if (loading) {
    return <LayoutSkeleton />;
  }

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
}

export const useBusiness = () => useContext(BusinessContext);
