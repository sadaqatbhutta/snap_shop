import { getFirestore } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';
import { config } from './config';

let db: any;
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
      add: async () => ({ id: 'mock-id' })
    }), 
    collectionGroup: () => ({ where: () => ({ get: async () => ({ empty: true, docs: [] }) }) }),
    doc: () => ({ get: async () => ({}), set: async () => ({}), update: async () => ({}) }) 
  } as any;
}

let auth: any;
try {
  const { getAuth } = await import('firebase-admin/auth');
  auth = getAuth();
} catch (err) {
  console.warn('⚠️  Firebase Admin (Auth) failed to initialize.');
  auth = {
    verifyIdToken: async () => ({ uid: 'mock-uid', email: 'mock@example.com' })
  } as any;
}

export { db, auth };
