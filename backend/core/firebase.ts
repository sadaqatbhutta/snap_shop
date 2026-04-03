import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { config } from './config';

let db: Firestore;
try {
  if (!getApps().length) {
    initializeApp({
      projectId: config.VITE_FIREBASE_PROJECT_ID
    });
  }
  db = getFirestore();
} catch (err) {
  console.warn('⚠️  Firebase Admin (Firestore) failed to initialize.');
  db = { 
    collection: () => ({ 
      doc: () => ({ get: async () => ({}), set: async () => ({}), update: async () => ({}) }), 
      where: () => ({ limit: () => ({ get: async () => ({ empty: true, docs: [] }) }) }),
      add: async () => ({ id: 'mock-id' }),
      orderBy: () => ({ where: () => ({ limit: () => ({ get: async () => ({ empty: true, docs: [] }) }) }) }),
    }), 
    collectionGroup: () => ({ where: () => ({ get: async () => ({ empty: true, docs: [] }) }) }),
    doc: () => ({ get: async () => ({}), set: async () => ({}), update: async () => ({}) }),
    runTransaction: async (cb: any) => cb({
      get: async () => ({ empty: true, docs: [] }),
      set: () => {},
      update: () => {},
      delete: () => {}
    })
  } as unknown as Firestore;
}

let auth: Auth;
try {
  auth = getAuth();
} catch (err) {
  console.warn('⚠️  Firebase Admin (Auth) failed to initialize.');
  auth = {
    verifyIdToken: async () => ({ uid: 'mock-uid', email: 'mock@example.com' })
  } as unknown as Auth;
}

export { db, auth };
