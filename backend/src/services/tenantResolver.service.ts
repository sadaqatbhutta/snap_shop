import { db } from '../config/firebase.js';
import { logger } from '../utils/logger.js';

export type ChannelBindingKind = 'whatsapp' | 'instagram' | 'facebook' | 'tiktok';

export function bindingDocId(kind: ChannelBindingKind, externalId: string): string {
  return `${kind}:${externalId.trim()}`;
}

/**
 * Resolve SnapShop businessId from provider external IDs (phone_number_id / page id / tiktok biz id).
 * Falls back to treating rawId as a business document id when it already exists (custom webhooks / demos).
 */
export async function resolveBusinessId(
  channel: string,
  rawBusinessId: string | undefined | null
): Promise<string | null> {
  const raw = (rawBusinessId || '').trim();
  if (!raw || raw === 'default') return null;

  const kind = channel as ChannelBindingKind;
  if (kind === 'whatsapp' || kind === 'instagram' || kind === 'facebook' || kind === 'tiktok') {
    const bindingSnap = await db.doc(`channel_bindings/${bindingDocId(kind, raw)}`).get();
    if (bindingSnap.exists) {
      const businessId = bindingSnap.data()?.businessId as string | undefined;
      if (businessId) return businessId;
    }
  }

  // Legacy: business docs that still store whatsappPhoneNumberId / metaPageId on the root doc
  if (channel === 'whatsapp') {
    const q = await db.collection('businesses').where('whatsappPhoneNumberId', '==', raw).limit(1).get();
    if (!q.empty) return q.docs[0].id;
  }
  if (channel === 'instagram' || channel === 'facebook') {
    const field = channel === 'instagram' ? 'instagramPageId' : 'facebookPageId';
    const q = await db.collection('businesses').where(field, '==', raw).limit(1).get();
    if (!q.empty) return q.docs[0].id;
    // Shared Meta page id field used by some setups
    const q2 = await db.collection('businesses').where('metaPageId', '==', raw).limit(1).get();
    if (!q2.empty) return q2.docs[0].id;
  }
  if (channel === 'tiktok') {
    const q = await db.collection('businesses').where('tiktokBusinessId', '==', raw).limit(1).get();
    if (!q.empty) return q.docs[0].id;
  }

  // Custom webhook / webchat-style payloads that already send SnapShop business_id
  const bizSnap = await db.doc(`businesses/${raw}`).get();
  if (bizSnap.exists) return raw;

  logger.warn({ channel, rawBusinessId: raw }, 'Could not resolve business for inbound channel id');
  return null;
}

export async function upsertChannelBinding(
  businessId: string,
  kind: ChannelBindingKind,
  externalId: string | null | undefined
) {
  const id = (externalId || '').trim();
  if (!id) return;

  await db.doc(`channel_bindings/${bindingDocId(kind, id)}`).set(
    {
      businessId,
      channel: kind,
      externalId: id,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function clearChannelBinding(kind: ChannelBindingKind, externalId: string | null | undefined) {
  const id = (externalId || '').trim();
  if (!id) return;
  await db.doc(`channel_bindings/${bindingDocId(kind, id)}`).delete().catch(() => undefined);
}
