import { v4 as uuidv4 } from 'uuid';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../config/firebase.js';

export type FeedbackRating = 'up' | 'down';

export async function recordAiFeedback(params: {
  businessId: string;
  conversationId: string;
  messageId?: string;
  rating: FeedbackRating;
  note?: string;
  authorUid?: string;
}) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const doc = {
    id,
    conversationId: params.conversationId,
    messageId: params.messageId || null,
    rating: params.rating,
    note: (params.note || '').slice(0, 500),
    authorUid: params.authorUid || null,
    createdAt: now,
  };

  await db.doc(`businesses/${params.businessId}/ai_feedback/${id}`).set(doc);

  const today = new Date().toISOString().split('T')[0];
  await db.doc(`businesses/${params.businessId}/stats/daily_${today}`).set(
    {
      aiFeedbackUp: FieldValue.increment(params.rating === 'up' ? 1 : 0),
      aiFeedbackDown: FieldValue.increment(params.rating === 'down' ? 1 : 0),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  if (params.rating === 'down' && params.note) {
    // Store as improvement hint for prompt tuning / RAG gaps
    await db.collection(`businesses/${params.businessId}/ai_improvement_hints`).add({
      conversationId: params.conversationId,
      note: params.note.slice(0, 500),
      createdAt: now,
    });
  }

  return doc;
}

export async function listRecentFeedback(businessId: string, limit = 50) {
  const snap = await db
    .collection(`businesses/${businessId}/ai_feedback`)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map(d => d.data());
}

export async function getImprovementHints(businessId: string, limit = 10): Promise<string[]> {
  const snap = await db
    .collection(`businesses/${businessId}/ai_improvement_hints`)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map(d => String(d.data().note || '')).filter(Boolean);
}
