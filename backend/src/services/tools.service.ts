import axios from 'axios';
import { db } from '../config/firebase.js';
import { loadBusinessSecrets } from './secrets.service.js';
import { logger } from '../utils/logger.js';

export type ToolName = 'check_order' | 'check_stock' | 'create_booking' | 'lookup_customer';

export type ToolCall = {
  name: ToolName;
  args: Record<string, string>;
};

export type ToolResult = {
  name: ToolName;
  ok: boolean;
  data: Record<string, unknown>;
};

type BusinessToolConfig = {
  orderLookupUrl?: string;
  stockLookupUrl?: string;
  bookingUrl?: string;
  shopifyStoreDomain?: string;
  shopifyAccessToken?: string;
  wooBaseUrl?: string;
  wooConsumerKey?: string;
  wooConsumerSecret?: string;
};

async function getToolConfig(businessId: string): Promise<BusinessToolConfig> {
  const secrets = await loadBusinessSecrets(businessId);
  const biz = (await db.doc(`businesses/${businessId}`).get()).data() || {};
  const integrations = (biz.aiIntegrations || {}) as BusinessToolConfig;
  return {
    orderLookupUrl: secrets.orderLookupUrl || integrations.orderLookupUrl || undefined,
    stockLookupUrl: secrets.stockLookupUrl || integrations.stockLookupUrl || undefined,
    bookingUrl: secrets.bookingUrl || integrations.bookingUrl || undefined,
    shopifyStoreDomain: secrets.shopifyStoreDomain || integrations.shopifyStoreDomain || undefined,
    shopifyAccessToken: secrets.shopifyAccessToken || undefined,
    wooBaseUrl: secrets.wooBaseUrl || integrations.wooBaseUrl || undefined,
    wooConsumerKey: secrets.wooConsumerKey || undefined,
    wooConsumerSecret: secrets.wooConsumerSecret || undefined,
  };
}

async function postOrGet(url: string, args: Record<string, string>) {
  const resp = await axios.post(url, args, { timeout: 8000, validateStatus: () => true });
  if (resp.status >= 200 && resp.status < 300) return resp.data;
  const getResp = await axios.get(url, { params: args, timeout: 8000, validateStatus: () => true });
  return getResp.data;
}

async function shopifyOrderLookup(cfg: BusinessToolConfig, orderId: string) {
  if (!cfg.shopifyStoreDomain || !cfg.shopifyAccessToken) return null;
  const domain = cfg.shopifyStoreDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const resp = await axios.get(`https://${domain}/admin/api/2024-10/orders.json`, {
    params: { name: orderId, status: 'any' },
    headers: { 'X-Shopify-Access-Token': cfg.shopifyAccessToken },
    timeout: 8000,
    validateStatus: () => true,
  });
  if (resp.status >= 200 && resp.status < 300) {
    const order = resp.data?.orders?.[0];
    if (!order) return { found: false, orderId };
    return {
      found: true,
      orderId: order.name,
      status: order.fulfillment_status || order.financial_status,
      total: order.total_price,
      currency: order.currency,
    };
  }
  return null;
}

async function wooStockLookup(cfg: BusinessToolConfig, skuOrName: string) {
  if (!cfg.wooBaseUrl || !cfg.wooConsumerKey || !cfg.wooConsumerSecret) return null;
  const base = cfg.wooBaseUrl.replace(/\/$/, '');
  const resp = await axios.get(`${base}/wp-json/wc/v3/products`, {
    params: {
      search: skuOrName,
      consumer_key: cfg.wooConsumerKey,
      consumer_secret: cfg.wooConsumerSecret,
    },
    timeout: 8000,
    validateStatus: () => true,
  });
  if (resp.status >= 200 && resp.status < 300) {
    const product = resp.data?.[0];
    if (!product) return { found: false, query: skuOrName };
    return {
      found: true,
      name: product.name,
      sku: product.sku,
      stockStatus: product.stock_status,
      stockQuantity: product.stock_quantity,
      price: product.price,
    };
  }
  return null;
}

export async function executeTool(
  businessId: string,
  call: ToolCall,
  context?: { customerId?: string; customerExternalId?: string }
): Promise<ToolResult> {
  const cfg = await getToolConfig(businessId);

  try {
    if (call.name === 'check_order') {
      const orderId = call.args.orderId || call.args.query || '';
      if (cfg.orderLookupUrl) {
        const data = await postOrGet(cfg.orderLookupUrl, { ...call.args, orderId, businessId });
        return { name: call.name, ok: true, data: typeof data === 'object' ? data : { result: data } };
      }
      const shopify = await shopifyOrderLookup(cfg, orderId);
      if (shopify) return { name: call.name, ok: true, data: shopify };
      return {
        name: call.name,
        ok: true,
        data: {
          configured: false,
          message: `Order lookup is not connected yet. Tell the customer a human will check order ${orderId || '(missing id)'} shortly.`,
        },
      };
    }

    if (call.name === 'check_stock') {
      const query = call.args.sku || call.args.product || call.args.query || '';
      if (cfg.stockLookupUrl) {
        const data = await postOrGet(cfg.stockLookupUrl, { ...call.args, query, businessId });
        return { name: call.name, ok: true, data: typeof data === 'object' ? data : { result: data } };
      }
      const woo = await wooStockLookup(cfg, query);
      if (woo) return { name: call.name, ok: true, data: woo };
      return {
        name: call.name,
        ok: true,
        data: {
          configured: false,
          message: `Stock lookup is not connected. Ask clarifying product details and escalate if needed for: ${query || 'unknown item'}.`,
        },
      };
    }

    if (call.name === 'create_booking') {
      if (cfg.bookingUrl) {
        const data = await postOrGet(cfg.bookingUrl, {
          ...call.args,
          businessId,
          customerId: context?.customerId || '',
        });
        return { name: call.name, ok: true, data: typeof data === 'object' ? data : { result: data } };
      }
      return {
        name: call.name,
        ok: true,
        data: {
          configured: false,
          bookingRequested: true,
          details: call.args,
          message: 'Booking system not connected. Capture preferred time and escalate to a human.',
        },
      };
    }

    if (call.name === 'lookup_customer') {
      if (context?.customerId) {
        const snap = await db.doc(`businesses/${businessId}/customers/${context.customerId}`).get();
        const data = snap.data() || {};
        const memorySnap = await db.doc(`businesses/${businessId}/customers/${context.customerId}/private/memory`).get();
        return {
          name: call.name,
          ok: true,
          data: {
            name: data.name,
            channel: data.channel,
            tags: data.tags || [],
            notes: data.notes || '',
            memory: memorySnap.exists ? memorySnap.data() : null,
          },
        };
      }
      return { name: call.name, ok: true, data: { found: false } };
    }

    return { name: call.name, ok: false, data: { error: 'Unknown tool' } };
  } catch (err: any) {
    logger.warn({ err, businessId, tool: call.name }, 'Tool execution failed');
    return { name: call.name, ok: false, data: { error: err?.message || 'Tool failed' } };
  }
}

export function detectLikelyTools(message: string): ToolCall[] {
  const lower = message.toLowerCase();
  const calls: ToolCall[] = [];

  const orderMatch = lower.match(/order\s*#?\s*([a-z0-9\-]+)/i) || lower.match(/tracking\s*#?\s*([a-z0-9\-]+)/i);
  if (/(order|tracking|shipment|delivery status)/i.test(lower)) {
    calls.push({ name: 'check_order', args: { orderId: orderMatch?.[1] || '', query: message } });
  }
  if (/(in stock|available|inventory|sku|price of)/i.test(lower)) {
    calls.push({ name: 'check_stock', args: { query: message } });
  }
  if (/(book|appointment|schedule|reservation)/i.test(lower)) {
    calls.push({ name: 'create_booking', args: { query: message } });
  }
  return calls.slice(0, 2);
}

export function formatToolResultsForPrompt(results: ToolResult[]): string {
  if (!results.length) return 'No tool results.';
  return results.map(r => `${r.name} (${r.ok ? 'ok' : 'failed'}): ${JSON.stringify(r.data)}`).join('\n');
}
