import { db } from '../config/firebase.js';

export interface BusinessSecrets {
  metaAccessToken?: string | null;
  whatsappPhoneNumberId?: string | null;
  facebookPageId?: string | null;
  instagramPageId?: string | null;
  metaPageId?: string | null;
  tiktokAccessToken?: string | null;
  tiktokApiBase?: string | null;
  tiktokSendPath?: string | null;
  tiktokBusinessId?: string | null;
  /** Per-tenant HMAC secret for X-Snap-Signature (optional). */
  webhookAppSecret?: string | null;
  /** AI tool / commerce integrations */
  orderLookupUrl?: string | null;
  stockLookupUrl?: string | null;
  bookingUrl?: string | null;
  shopifyStoreDomain?: string | null;
  shopifyAccessToken?: string | null;
  wooBaseUrl?: string | null;
  wooConsumerKey?: string | null;
  wooConsumerSecret?: string | null;
}

const SECRETS_PATH = (businessId: string) => `businesses/${businessId}/private/credentials`;

/** Load channel secrets (private subcollection first, then legacy root fields). */
export async function loadBusinessSecrets(businessId: string): Promise<BusinessSecrets> {
  const [privSnap, bizSnap] = await Promise.all([
    db.doc(SECRETS_PATH(businessId)).get(),
    db.doc(`businesses/${businessId}`).get(),
  ]);
  const priv = (privSnap.exists ? privSnap.data() : {}) as BusinessSecrets;
  const legacy = (bizSnap.exists ? bizSnap.data() : {}) as BusinessSecrets;

  return {
    metaAccessToken: priv.metaAccessToken ?? legacy.metaAccessToken ?? null,
    whatsappPhoneNumberId: priv.whatsappPhoneNumberId ?? legacy.whatsappPhoneNumberId ?? null,
    facebookPageId: priv.facebookPageId ?? legacy.facebookPageId ?? null,
    instagramPageId: priv.instagramPageId ?? legacy.instagramPageId ?? null,
    metaPageId: priv.metaPageId ?? legacy.metaPageId ?? null,
    tiktokAccessToken: priv.tiktokAccessToken ?? legacy.tiktokAccessToken ?? null,
    tiktokApiBase: priv.tiktokApiBase ?? legacy.tiktokApiBase ?? null,
    tiktokSendPath: priv.tiktokSendPath ?? legacy.tiktokSendPath ?? null,
    tiktokBusinessId: priv.tiktokBusinessId ?? legacy.tiktokBusinessId ?? null,
    webhookAppSecret: priv.webhookAppSecret ?? null,
    orderLookupUrl: priv.orderLookupUrl ?? null,
    stockLookupUrl: priv.stockLookupUrl ?? null,
    bookingUrl: priv.bookingUrl ?? null,
    shopifyStoreDomain: priv.shopifyStoreDomain ?? null,
    shopifyAccessToken: priv.shopifyAccessToken ?? null,
    wooBaseUrl: priv.wooBaseUrl ?? null,
    wooConsumerKey: priv.wooConsumerKey ?? null,
    wooConsumerSecret: priv.wooConsumerSecret ?? null,
  };
}

export async function saveBusinessSecrets(businessId: string, patch: Partial<BusinessSecrets>) {
  const cleaned: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    cleaned[k] = typeof v === 'string' ? (v.trim() || null) : v;
  }
  await db.doc(SECRETS_PATH(businessId)).set(cleaned, { merge: true });
}

/** Strip sensitive / server-owned fields from a business root document after migrating to private. */
export async function scrubLegacySecretsFromBusinessDoc(businessId: string) {
  await db.doc(`businesses/${businessId}`).set(
    {
      metaAccessToken: null,
      tiktokAccessToken: null,
      tiktokApiBase: null,
      tiktokSendPath: null,
    },
    { merge: true }
  );
}
