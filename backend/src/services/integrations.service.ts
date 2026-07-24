import { db } from '../config/firebase.js';
import { buildError } from '../utils/errors.js';
import { recordAuditEvent } from './audit.service.js';

export interface ChannelCredentialsInput {
  metaAccessToken?: string;
  whatsappPhoneNumberId?: string;
  tiktokAccessToken?: string;
  tiktokApiBase?: string;
  tiktokSendPath?: string;
}

function maskSecret(value: string | undefined | null): { configured: boolean; hint: string | null } {
  if (!value || !String(value).trim()) return { configured: false, hint: null };
  const v = String(value);
  const hint = v.length <= 4 ? '****' : `••••${v.slice(-4)}`;
  return { configured: true, hint };
}

export async function getIntegrationsStatus(businessId: string) {
  const snap = await db.doc(`businesses/${businessId}`).get();
  if (!snap.exists) throw buildError('BUSINESS_NOT_FOUND', 'Business does not exist', 404);
  const data = snap.data() || {};

  return {
    metaAccessToken: maskSecret(data.metaAccessToken),
    whatsappPhoneNumberId: maskSecret(data.whatsappPhoneNumberId),
    tiktokAccessToken: maskSecret(data.tiktokAccessToken),
    tiktokApiBase: data.tiktokApiBase || null,
    tiktokSendPath: data.tiktokSendPath || null,
    webhookVerifyHint: 'Use the platform WEBHOOK_VERIFY_TOKEN from your Meta / TikTok app settings.',
  };
}

export async function updateIntegrations(
  businessId: string,
  input: ChannelCredentialsInput,
  actorUid: string
) {
  const snap = await db.doc(`businesses/${businessId}`).get();
  if (!snap.exists) throw buildError('BUSINESS_NOT_FOUND', 'Business does not exist', 404);

  const patch: Record<string, unknown> = {
    'onboarding.channelReviewed': true,
    updatedAt: new Date().toISOString(),
  };

  // Empty string clears; undefined leaves unchanged.
  if (input.metaAccessToken !== undefined) {
    patch.metaAccessToken = input.metaAccessToken.trim() || null;
  }
  if (input.whatsappPhoneNumberId !== undefined) {
    patch.whatsappPhoneNumberId = input.whatsappPhoneNumberId.trim() || null;
  }
  if (input.tiktokAccessToken !== undefined) {
    patch.tiktokAccessToken = input.tiktokAccessToken.trim() || null;
  }
  if (input.tiktokApiBase !== undefined) {
    patch.tiktokApiBase = input.tiktokApiBase.trim() || null;
  }
  if (input.tiktokSendPath !== undefined) {
    patch.tiktokSendPath = input.tiktokSendPath.trim() || null;
  }

  await snap.ref.set(patch, { merge: true });
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
