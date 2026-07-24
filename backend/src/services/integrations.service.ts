import { db } from '../config/firebase.js';
import { buildError } from '../utils/errors.js';
import { recordAuditEvent } from './audit.service.js';
import { loadBusinessSecrets, saveBusinessSecrets, scrubLegacySecretsFromBusinessDoc } from './secrets.service.js';
import { clearChannelBinding, upsertChannelBinding } from './tenantResolver.service.js';

export interface ChannelCredentialsInput {
  metaAccessToken?: string;
  whatsappPhoneNumberId?: string;
  facebookPageId?: string;
  instagramPageId?: string;
  metaPageId?: string;
  tiktokAccessToken?: string;
  tiktokApiBase?: string;
  tiktokSendPath?: string;
  tiktokBusinessId?: string;
  /** Set true to rotate a new per-tenant X-Snap-Signature secret. */
  rotateWebhookAppSecret?: boolean;
}

function maskSecret(value: string | undefined | null): { configured: boolean; hint: string | null } {
  if (!value || !String(value).trim()) return { configured: false, hint: null };
  const v = String(value);
  const hint = v.length <= 4 ? '****' : `••••${v.slice(-4)}`;
  return { configured: true, hint };
}

function maskId(value: string | undefined | null): { configured: boolean; hint: string | null } {
  if (!value || !String(value).trim()) return { configured: false, hint: null };
  return { configured: true, hint: String(value) };
}

export async function getIntegrationsStatus(businessId: string) {
  const snap = await db.doc(`businesses/${businessId}`).get();
  if (!snap.exists) throw buildError('BUSINESS_NOT_FOUND', 'Business does not exist', 404);
  const secrets = await loadBusinessSecrets(businessId);

  return {
    metaAccessToken: maskSecret(secrets.metaAccessToken),
    whatsappPhoneNumberId: maskId(secrets.whatsappPhoneNumberId),
    facebookPageId: maskId(secrets.facebookPageId),
    instagramPageId: maskId(secrets.instagramPageId),
    metaPageId: maskId(secrets.metaPageId),
    tiktokAccessToken: maskSecret(secrets.tiktokAccessToken),
    tiktokBusinessId: maskId(secrets.tiktokBusinessId),
    webhookAppSecret: maskSecret(secrets.webhookAppSecret),
    tiktokApiBase: secrets.tiktokApiBase || null,
    tiktokSendPath: secrets.tiktokSendPath || null,
    webhookVerifyHint: 'Platform WEBHOOK_VERIFY_TOKEN for Meta verify; optional per-tenant webhookAppSecret for X-Snap-Signature.',
  };
}

export async function updateIntegrations(
  businessId: string,
  input: ChannelCredentialsInput,
  actorUid: string
) {
  const snap = await db.doc(`businesses/${businessId}`).get();
  if (!snap.exists) throw buildError('BUSINESS_NOT_FOUND', 'Business does not exist', 404);

  const prev = await loadBusinessSecrets(businessId);
  const secretPatch: Record<string, string | null | undefined> = {};

  if (input.metaAccessToken !== undefined) secretPatch.metaAccessToken = input.metaAccessToken;
  if (input.whatsappPhoneNumberId !== undefined) secretPatch.whatsappPhoneNumberId = input.whatsappPhoneNumberId;
  if (input.facebookPageId !== undefined) secretPatch.facebookPageId = input.facebookPageId;
  if (input.instagramPageId !== undefined) secretPatch.instagramPageId = input.instagramPageId;
  if (input.metaPageId !== undefined) secretPatch.metaPageId = input.metaPageId;
  if (input.tiktokAccessToken !== undefined) secretPatch.tiktokAccessToken = input.tiktokAccessToken;
  if (input.tiktokApiBase !== undefined) secretPatch.tiktokApiBase = input.tiktokApiBase;
  if (input.tiktokSendPath !== undefined) secretPatch.tiktokSendPath = input.tiktokSendPath;
  if (input.tiktokBusinessId !== undefined) secretPatch.tiktokBusinessId = input.tiktokBusinessId;
  if (input.rotateWebhookAppSecret) {
    const crypto = await import('crypto');
    secretPatch.webhookAppSecret = crypto.randomBytes(32).toString('hex');
  }

  // Public non-secret routing ids (for legacy queries + UI hints) — never store access tokens here.
  const publicPatch: Record<string, unknown> = {
    'onboarding.channelReviewed': true,
    updatedAt: new Date().toISOString(),
  };
  if (input.whatsappPhoneNumberId !== undefined) {
    publicPatch.whatsappPhoneNumberId = input.whatsappPhoneNumberId.trim() || null;
  }
  if (input.facebookPageId !== undefined) {
    publicPatch.facebookPageId = input.facebookPageId.trim() || null;
  }
  if (input.instagramPageId !== undefined) {
    publicPatch.instagramPageId = input.instagramPageId.trim() || null;
  }
  if (input.metaPageId !== undefined) {
    publicPatch.metaPageId = input.metaPageId.trim() || null;
  }
  if (input.tiktokBusinessId !== undefined) {
    publicPatch.tiktokBusinessId = input.tiktokBusinessId.trim() || null;
  }

  await saveBusinessSecrets(businessId, secretPatch);
  const next = await loadBusinessSecrets(businessId);
  publicPatch.integrationsConfigured = {
    meta: Boolean(next.metaAccessToken),
    whatsapp: Boolean(next.whatsappPhoneNumberId),
    facebook: Boolean(next.facebookPageId || next.metaPageId),
    instagram: Boolean(next.instagramPageId || next.metaPageId),
    tiktok: Boolean(next.tiktokAccessToken),
  };

  await snap.ref.set(publicPatch, { merge: true });
  await scrubLegacySecretsFromBusinessDoc(businessId);

  // Rebind channel routing indexes
  if (input.whatsappPhoneNumberId !== undefined) {
    if (prev.whatsappPhoneNumberId && prev.whatsappPhoneNumberId !== next.whatsappPhoneNumberId) {
      await clearChannelBinding('whatsapp', prev.whatsappPhoneNumberId);
    }
    await upsertChannelBinding(businessId, 'whatsapp', next.whatsappPhoneNumberId);
  }
  if (input.facebookPageId !== undefined || input.metaPageId !== undefined) {
    const prevFb = prev.facebookPageId || prev.metaPageId;
    const nextFb = next.facebookPageId || next.metaPageId;
    if (prevFb && prevFb !== nextFb) await clearChannelBinding('facebook', prevFb);
    await upsertChannelBinding(businessId, 'facebook', nextFb);
  }
  if (input.instagramPageId !== undefined || input.metaPageId !== undefined) {
    const prevIg = prev.instagramPageId || prev.metaPageId;
    const nextIg = next.instagramPageId || next.metaPageId;
    if (prevIg && prevIg !== nextIg) await clearChannelBinding('instagram', prevIg);
    await upsertChannelBinding(businessId, 'instagram', nextIg);
  }
  if (input.tiktokBusinessId !== undefined) {
    if (prev.tiktokBusinessId && prev.tiktokBusinessId !== next.tiktokBusinessId) {
      await clearChannelBinding('tiktok', prev.tiktokBusinessId);
    }
    await upsertChannelBinding(businessId, 'tiktok', next.tiktokBusinessId);
  }

  await recordAuditEvent({
    businessId,
    actorUid,
    action: 'integrations.updated',
    meta: {
      fields: Object.keys(input).filter(k => (input as any)[k] !== undefined),
    },
  });

  return getIntegrationsStatus(businessId);
}
