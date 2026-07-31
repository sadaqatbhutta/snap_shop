import axios from 'axios';
import { db } from '../config/firebase.js';
import { config } from '../config/config.js';
import { buildError } from '../utils/errors.js';
import { loadBusinessSecrets } from './secrets.service.js';
import { logger } from '../utils/logger.js';

const GRAPH = 'https://graph.facebook.com/v19.0';

export type MetaRemoteTemplate = {
  name: string;
  language: string;
  status: string;
  category?: string;
  bodyText: string;
  bodyParamCount: number;
};

function extractBodyFromComponents(components: unknown): { bodyText: string; bodyParamCount: number } {
  if (!Array.isArray(components)) return { bodyText: '', bodyParamCount: 0 };
  const body = components.find(
    (c: { type?: string }) => String(c?.type || '').toUpperCase() === 'BODY',
  ) as { text?: string; example?: { body_text?: string[][] } } | undefined;
  const bodyText = String(body?.text || '').trim();
  const examples = body?.example?.body_text?.[0];
  const bodyParamCount = Array.isArray(examples) ? examples.length : (bodyText.match(/\{\{\d+\}\}/g) || []).length;
  return { bodyText, bodyParamCount };
}

export async function fetchApprovedMetaTemplates(businessId: string): Promise<MetaRemoteTemplate[]> {
  const secrets = await loadBusinessSecrets(businessId);
  const accessToken = secrets.metaAccessToken || config.META_ACCESS_TOKEN;
  const phoneNumberId = secrets.whatsappPhoneNumberId || config.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken) {
    throw buildError('META_TOKEN_MISSING', 'Connect Meta / WhatsApp in Settings first', 400);
  }
  if (!phoneNumberId) {
    throw buildError('WHATSAPP_PHONE_MISSING', 'WhatsApp phone number ID is not configured', 400);
  }

  const phoneResp = await axios.get(`${GRAPH}/${phoneNumberId}`, {
    params: { fields: 'whatsapp_business_account', access_token: accessToken },
  });
  const wabaId = phoneResp.data?.whatsapp_business_account?.id;
  if (!wabaId) {
    throw buildError('WABA_NOT_FOUND', 'Could not resolve WhatsApp Business Account from phone number', 400);
  }

  const templates: MetaRemoteTemplate[] = [];
  let url: string | null = `${GRAPH}/${wabaId}/message_templates`;
  let params: Record<string, string | number> | undefined = {
    access_token: accessToken,
    limit: 100,
    fields: 'name,language,status,category,components',
  };

  while (url) {
    const resp = await axios.get(url, params ? { params } : undefined);
    const batch = Array.isArray(resp.data?.data) ? resp.data.data : [];
    for (const row of batch) {
      if (String(row.status || '').toUpperCase() !== 'APPROVED') continue;
      const { bodyText, bodyParamCount } = extractBodyFromComponents(row.components);
      templates.push({
        name: String(row.name || ''),
        language: String(row.language || 'en'),
        status: String(row.status || ''),
        category: row.category ? String(row.category) : undefined,
        bodyText,
        bodyParamCount,
      });
    }
    const next = resp.data?.paging?.next as string | undefined;
    url = next || null;
    params = undefined;
  }

  return templates.filter((t) => t.name);
}

/**
 * Upsert approved Meta HSM templates into the business templates collection.
 * Matches on metaTemplateName + metaLanguageCode.
 */
export async function syncMetaTemplates(businessId: string): Promise<{
  fetched: number;
  created: number;
  updated: number;
}> {
  const remote = await fetchApprovedMetaTemplates(businessId);
  const existingSnap = await db
    .collection(`businesses/${businessId}/templates`)
    .where('channelScope', '==', 'whatsapp_meta')
    .get();

  const byKey = new Map<string, (typeof existingSnap.docs)[number]>();
  for (const docSnap of existingSnap.docs) {
    const d = docSnap.data();
    const key = `${String(d.metaTemplateName || '').toLowerCase()}::${String(d.metaLanguageCode || 'en').toLowerCase()}`;
    byKey.set(key, docSnap);
  }

  const now = new Date().toISOString();
  let created = 0;
  let updated = 0;

  for (const t of remote) {
    const key = `${t.name.toLowerCase()}::${t.language.toLowerCase()}`;
    const bodyParams =
      t.bodyParamCount > 0 ? Array.from({ length: t.bodyParamCount }, (_, i) => `{{${i + 1}}}`) : [];
    const payload = {
      name: t.name,
      content: t.bodyText || t.name,
      type: 'text' as const,
      channelScope: 'whatsapp_meta' as const,
      metaTemplateName: t.name,
      metaLanguageCode: t.language,
      metaBodyParams: bodyParams.length ? bodyParams : null,
      metaCategory: t.category || null,
      metaStatus: t.status,
      updatedAt: now,
    };

    const existing = byKey.get(key);
    if (existing) {
      await existing.ref.update(payload);
      updated += 1;
    } else {
      await db.collection(`businesses/${businessId}/templates`).add({
        businessId,
        ...payload,
        usageCount: 0,
        createdAt: now,
      });
      created += 1;
    }
  }

  logger.info({ businessId, fetched: remote.length, created, updated }, 'Synced Meta WhatsApp templates');
  return { fetched: remote.length, created, updated };
}
