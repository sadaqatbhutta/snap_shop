/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Business } from '../types';

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

  const loadBusiness = async () => {
    const user = auth.currentUser;
    if (!user) { setLoading(false); return; }

    const q = query(collection(db, 'businesses'), where('ownerEmail', '==', user.email));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const d = snap.docs[0];
      setBusiness({ id: d.id, ...d.data() } as Business);
    } else {
      const newId = user.uid;
      const newBusiness: Business = {
        id: newId,
        name: 'My Business',
        description: '',
        aiContext: 'We are a business that helps customers with their needs.',
        faqs: [],
        ownerEmail: user.email!,
        createdAt: new Date().toISOString(),
        confidenceThreshold: 0.7,
      };
      await setDoc(doc(db, 'businesses', newId), newBusiness);
      setBusiness(newBusiness);
    }
    setLoading(false);
  };

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) loadBusiness();
      else { setBusiness(null); setLoading(false); }
    });
    return unsub;
  }, []);

  return (
    <BusinessContext.Provider value={{ business, businessId: business?.id ?? null, loading, refreshBusiness: loadBusiness }}>
      {children}
    </BusinessContext.Provider>
  );
}

export const useBusiness = () => useContext(BusinessContext);
