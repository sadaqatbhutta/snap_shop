import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth } from '../firebase';

// ─── Generic Helpers ──────────────────────────────────────────────────────────

export async function getDocument<T>(path: string, id: string): Promise<T | null> {
  const snap = await getDoc(doc(db, path, id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null;
}

export async function getCollection<T>(path: string, constraints: any[] = []): Promise<T[]> {
  const q = query(collection(db, path), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as T));
}

export async function createDocument<T>(path: string, id: string, data: T): Promise<void> {
  await setDoc(doc(db, path, id), data as any);
}

export async function updateDocument<T>(path: string, id: string, data: Partial<T>): Promise<void> {
  await updateDoc(doc(db, path, id), data as any);
}

export async function deleteDocument(path: string, id: string): Promise<void> {
  await deleteDoc(doc(db, path, id));
}

export function subscribeToCollection<T>(
  path: string,
  constraints: any[],
  onNext: (data: T[]) => void
) {
  const q = query(collection(db, path), ...constraints);
  return onSnapshot(q, snap => {
    onNext(snap.docs.map(d => ({ id: d.id, ...d.data() } as T)));
  });
}
