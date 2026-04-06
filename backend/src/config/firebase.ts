import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import { config } from './config.js';
import { logger } from '../utils/logger.js';

let db: Firestore;
let auth: Auth;

try {
  if (!getApps().length) {
    const credentials = config.FIREBASE_SERVICE_ACCOUNT_KEY
      ? JSON.parse(config.FIREBASE_SERVICE_ACCOUNT_KEY)
      : undefined;

    initializeApp({
      projectId: config.FIREBASE_PROJECT_ID,
      ...(credentials ? { credential: cert(credentials) } : {}),
    });
  }

  db = getFirestore();
  auth = getAuth();
} catch (error) {
  logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Firebase Admin initialization failed');
  throw error;
}

export { db, auth };
