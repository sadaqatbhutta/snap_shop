import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Business } from '../../../shared/types';

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

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  const loadBusiness = useCallback(async () => {
    setLoading(true);
    const user = auth.currentUser;
    if (!user) { setLoading(false); return; }

    try {
      const bizRef = doc(db, 'businesses', user.uid);
      const bizSnap = await getDoc(bizRef);

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
        await setDoc(bizRef, newBusiness);
        setBusiness(newBusiness);
      }
    } catch (err) {
      console.error('BusinessContext error:', err);
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

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
}

export const useBusiness = () => useContext(BusinessContext);
