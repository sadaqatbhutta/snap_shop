import crypto from 'crypto';
import axios from 'axios';
import { config } from '../config/config.js';
import { buildError } from '../utils/errors.js';
import { saveBusinessSecrets, loadBusinessSecrets } from './secrets.service.js';
import { upsertChannelBinding } from './tenantResolver.service.js';
import { db } from '../config/firebase.js';
import { logger } from '../utils/logger.js';
import { recordAuditEvent } from './audit.service.js';

export function isMetaOAuthConfigured(): boolean {
  return Boolean(config.META_APP_ID && config.META_APP_SECRET);
}

function oauthState(businessId: string, uid: string): string {
  const payload = Buffer.from(JSON.stringify({ businessId, uid, t: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', config.WEBHOOK_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function parseOAuthState(state: string): { businessId: string; uid: string } {
  const [payload, sig] = state.split('.');
  if (!payload || !sig) throw buildError('INVALID_STATE', 'Invalid OAuth state', 400);
  const expected = crypto.createHmac('sha256', config.WEBHOOK_SECRET).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw buildError('INVALID_STATE', 'OAuth state signature mismatch', 400);
  }
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
    businessId: string;
    uid: string;
    t: number;
  };
  if (Date.now() - data.t > 15 * 60 * 1000) {
    throw buildError('INVALID_STATE', 'OAuth state expired', 400);
  }
  return { businessId: data.businessId, uid: data.uid };
}

export function buildMetaOAuthUrl(businessId: string, uid: string): string {
  if (!isMetaOAuthConfigured()) {
    throw buildError('OAUTH_NOT_CONFIGURED', 'Set META_APP_ID and META_APP_SECRET to enable Meta connect', 503);
  }
  const redirectUri = `${config.APP_URL.replace(/\/$/, '')}/api/oauth/meta/callback`;
  const params = new URLSearchParams({
    client_id: config.META_APP_ID!,
    redirect_uri: redirectUri,
    state: oauthState(businessId, uid),
    scope: config.META_OAUTH_SCOPES,
    response_type: 'code',
  });
  return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
}

export async function exchangeMetaCode(code: string, businessId: string, actorUid: string) {
  if (!isMetaOAuthConfigured()) {
    throw buildError('OAUTH_NOT_CONFIGURED', 'Meta OAuth is not configured', 503);
  }

  const redirectUri = `${config.APP_URL.replace(/\/$/, '')}/api/oauth/meta/callback`;
  const tokenResp = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
    params: {
      client_id: config.META_APP_ID,
      client_secret: config.META_APP_SECRET,
      redirect_uri: redirectUri,
      code,
    },
    timeout: 20000,
  });

  const shortToken = tokenResp.data?.access_token as string | undefined;
  if (!shortToken) throw buildError('OAUTH_FAILED', 'No access token returned from Meta', 502);

  // Exchange for long-lived user token
  let accessToken = shortToken;
  try {
    const longResp = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: config.META_APP_ID,
        client_secret: config.META_APP_SECRET,
        fb_exchange_token: shortToken,
      },
      timeout: 20000,
    });
    if (longResp.data?.access_token) accessToken = longResp.data.access_token;
  } catch (err) {
    logger.warn({ err }, 'Long-lived Meta token exchange failed; using short-lived token');
  }

  // Discover WhatsApp phone number id + pages when available
  let whatsappPhoneNumberId: string | null = null;
  let facebookPageId: string | null = null;
  let instagramPageId: string | null = null;

  try {
    const pages = await axios.get('https://graph.facebook.com/v19.0/me/accounts', {
      params: { access_token: accessToken, fields: 'id,name,access_token,instagram_business_account' },
      timeout: 20000,
    });
    const page = pages.data?.data?.[0];
    if (page?.id) facebookPageId = String(page.id);
    if (page?.instagram_business_account?.id) instagramPageId = String(page.instagram_business_account.id);
  } catch (err) {
    logger.warn({ err }, 'Could not list Meta pages after OAuth');
  }

  try {
    const waba = await axios.get('https://graph.facebook.com/v19.0/me/businesses', {
      params: { access_token: accessToken },
      timeout: 20000,
    });
    const business = waba.data?.data?.[0];
    if (business?.id) {
      const phones = await axios.get(`https://graph.facebook.com/v19.0/${business.id}/owned_whatsapp_business_accounts`, {
        params: { access_token: accessToken },
        timeout: 20000,
      });
      const wabaId = phones.data?.data?.[0]?.id;
      if (wabaId) {
        const nums = await axios.get(`https://graph.facebook.com/v19.0/${wabaId}/phone_numbers`, {
          params: { access_token: accessToken },
          timeout: 20000,
        });
        const phoneId = nums.data?.data?.[0]?.id;
        if (phoneId) whatsappPhoneNumberId = String(phoneId);
      }
    }
  } catch (err) {
    logger.warn({ err }, 'Could not resolve WhatsApp phone number id after OAuth');
  }

  // Generate a per-tenant webhook app secret (store for custom/internal verification)
  const webhookAppSecret = crypto.randomBytes(32).toString('hex');

  await saveBusinessSecrets(businessId, {
    metaAccessToken: accessToken,
    whatsappPhoneNumberId,
    facebookPageId,
    instagramPageId,
    webhookAppSecret,
  });

  await db.doc(`businesses/${businessId}`).set(
    {
      whatsappPhoneNumberId,
      facebookPageId,
      instagramPageId,
      'onboarding.channelReviewed': true,
      integrationsConfigured: {
        meta: true,
        whatsapp: Boolean(whatsappPhoneNumberId),
        facebook: Boolean(facebookPageId),
        instagram: Boolean(instagramPageId),
      },
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  if (whatsappPhoneNumberId) await upsertChannelBinding(businessId, 'whatsapp', whatsappPhoneNumberId);
  if (facebookPageId) await upsertChannelBinding(businessId, 'facebook', facebookPageId);
  if (instagramPageId) await upsertChannelBinding(businessId, 'instagram', instagramPageId);

  await recordAuditEvent({
    businessId,
    actorUid,
    action: 'integrations.meta_oauth_connected',
    meta: {
      whatsappPhoneNumberId: Boolean(whatsappPhoneNumberId),
      facebookPageId: Boolean(facebookPageId),
      instagramPageId: Boolean(instagramPageId),
    },
  });

  return {
    connected: true,
    whatsappPhoneNumberId,
    facebookPageId,
    instagramPageId,
  };
}

export async function getTenantWebhookSecret(businessId: string): Promise<string | null> {
  const secrets = await loadBusinessSecrets(businessId);
  return secrets.webhookAppSecret || null;
}
