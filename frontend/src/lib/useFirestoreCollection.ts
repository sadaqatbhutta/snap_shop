import { useCallback, useEffect, useState } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  where,
  onSnapshot,
  getDocs,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '../firebase';
import { PAGE_LOAD_TIMEOUT_MS } from './constants';

export type FirestoreCollectionOptions = {
  timeoutLabel?: string;
  /** If true, do not show loading state (lists can start empty) */
  silent?: boolean;
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  limitTo?: number;
  whereField?: string;
  whereValue?: string;
};

/**
 * Loads a business subcollection with getDocs first, then onSnapshot for live updates.
 */
export function useFirestoreCollection<T extends { id: string }>(
  businessId: string | null,
  subcollection: string,
  options: FirestoreCollectionOptions = {},
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(!options.silent);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const retry = useCallback(() => setRetryKey(k => k + 1), []);

  const {
    timeoutLabel,
    silent,
    orderByField,
    orderDirection = 'desc',
    limitTo,
    whereField,
    whereValue,
  } = options;

  useEffect(() => {
    if (!businessId) {
      setItems([]);
      setLoading(false);
      return;
    }

    if (!silent) {
      setLoading(true);
    }
    setError(null);
    let cancelled = false;
    const unsubs: Array<() => void> = [];

    const constraints: QueryConstraint[] = [];
    if (whereField && whereValue !== undefined) {
      constraints.push(where(whereField, '==', whereValue));
    }
    if (orderByField) {
      constraints.push(orderBy(orderByField, orderDirection));
    }
    if (limitTo) {
      constraints.push(limit(limitTo));
    }

    const colRef = collection(db, `businesses/${businessId}/${subcollection}`);
    const q = constraints.length ? query(colRef, ...constraints) : query(colRef);

    const timeout = window.setTimeout(() => {
      if (!cancelled && !silent) {
        setError(
          timeoutLabel ?? 'Loading is taking too long. Please retry in a moment.',
        );
        setLoading(false);
      }
    }, PAGE_LOAD_TIMEOUT_MS);

    void (async () => {
      try {
        const snap = await getDocs(q);
        if (cancelled) return;
        window.clearTimeout(timeout);
        setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as T)));
        if (!silent) setLoading(false);
      } catch (err) {
        if (cancelled) return;
        window.clearTimeout(timeout);
        console.error(`Firestore load failed (${subcollection}):`, err);
        setError(
          err instanceof Error
            ? err.message
            : 'Could not load data. Check Firebase rules and try again.',
        );
        if (!silent) setLoading(false);
        return;
      }

      if (cancelled) return;
      unsubs.push(
        onSnapshot(
          q,
          snap => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as T))),
          err => console.error(`Firestore listener failed (${subcollection}):`, err),
        ),
      );
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      unsubs.forEach(u => u());
    };
  }, [
    businessId,
    subcollection,
    retryKey,
    timeoutLabel,
    silent,
    orderByField,
    orderDirection,
    limitTo,
    whereField,
    whereValue,
  ]);

  return { items, setItems, loading, error, retry };
}
