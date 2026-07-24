import { db } from '../config/firebase.js';
import { buildError } from '../utils/errors.js';

export async function assertPlatformAdmin(uid: string) {
  const snap = await db.doc(`admins/${uid}`).get();
  if (!snap.exists) {
    throw buildError('FORBIDDEN', 'Platform admin access required', 403);
  }
}

export async function listBusinessesForAdmin(limit = 50) {
  const snap = await db.collection('businesses').orderBy('createdAt', 'desc').limit(limit).get();
  return snap.docs.map(doc => {
    const d = doc.data();
    return {
      id: doc.id,
      name: d.name || 'Untitled',
      ownerEmail: d.ownerEmail || null,
      createdAt: d.createdAt || null,
      plan: d.billing?.plan || 'free',
      billingStatus: d.billing?.status || 'active',
      usage: {
        messages: Number(d.usage?.messages || 0),
        aiCalls: Number(d.usage?.aiCalls || 0),
        broadcasts: Number(d.usage?.broadcasts || 0),
      },
    };
  });
}

export async function setBusinessPlan(businessId: string, plan: string) {
  if (!['free', 'growth', 'scale', 'enterprise'].includes(plan)) {
    throw buildError('INVALID_PLAN', 'Invalid plan id', 422);
  }
  const ref = db.doc(`businesses/${businessId}`);
  const snap = await ref.get();
  if (!snap.exists) throw buildError('BUSINESS_NOT_FOUND', 'Business does not exist', 404);

  await ref.set(
    {
      billing: {
        plan,
        status: 'active',
        updatedAt: new Date().toISOString(),
        source: 'platform_admin',
      },
    },
    { merge: true }
  );

  return { businessId, plan };
}
