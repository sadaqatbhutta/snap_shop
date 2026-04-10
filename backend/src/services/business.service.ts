import { db } from '../config/firebase.js';
import { buildError } from '../utils/errors.js';
import { recordAuditEvent } from './audit.service.js';

export async function deleteBusinessAccount(businessId: string, actorUid: string) {
  const businessRef = db.doc(`businesses/${businessId}`);
  const snap = await businessRef.get();
  if (!snap.exists) {
    throw buildError('BUSINESS_NOT_FOUND', 'Business not found', 404);
  }

  await recordAuditEvent({
    businessId,
    actorUid,
    action: 'business.delete_requested',
  });

  // Use recursive delete when available (firebase-admin firestore API).
  const firestore = db as unknown as { recursiveDelete?: (ref: FirebaseFirestore.DocumentReference) => Promise<void> };
  if (typeof firestore.recursiveDelete === 'function') {
    await firestore.recursiveDelete(businessRef);
  } else {
    // Fallback: soft delete to avoid partial destructive operation
    await businessRef.set(
      {
        deletedAt: new Date().toISOString(),
        status: 'deleted',
      },
      { merge: true }
    );
  }

  return { status: 'deleted', businessId };
}
