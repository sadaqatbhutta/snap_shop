import axios from 'axios';
import { db } from '../config/firebase.js';
import { config } from '../config/config.js';
import { buildError } from '../utils/errors.js';
import { PLAN_DEFINITIONS, PlanId } from '../../../shared/plans.js';
import { logger } from '../utils/logger.js';

const STRIPE_API = 'https://api.stripe.com/v1';

function requireStripe() {
  if (!config.STRIPE_SECRET_KEY) {
    throw buildError('BILLING_NOT_CONFIGURED', 'Stripe is not configured on this server', 503);
  }
  return config.STRIPE_SECRET_KEY;
}

async function stripeForm(path: string, params: Record<string, string>, method: 'POST' | 'GET' = 'POST') {
  const key = requireStripe();
  const body = new URLSearchParams(params);
  const url = method === 'GET' && Object.keys(params).length
    ? `${STRIPE_API}${path}?${body.toString()}`
    : `${STRIPE_API}${path}`;

  const resp = await axios.request({
    url,
    method,
    data: method === 'POST' ? body.toString() : undefined,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    timeout: 20000,
    validateStatus: () => true,
  });

  if (resp.status >= 400) {
    logger.error({ status: resp.status, data: resp.data }, 'Stripe API error');
    throw buildError('STRIPE_ERROR', resp.data?.error?.message || 'Stripe request failed', 502);
  }
  return resp.data;
}

function paidPlan(plan: string): plan is 'growth' | 'scale' {
  return plan === 'growth' || plan === 'scale';
}

function priceIdForPlan(plan: 'growth' | 'scale'): string {
  const priceId = plan === 'growth' ? config.STRIPE_PRICE_GROWTH : config.STRIPE_PRICE_SCALE;
  if (!priceId) {
    throw buildError('BILLING_NOT_CONFIGURED', `Stripe price for ${plan} is not configured`, 503);
  }
  return priceId;
}

export function isBillingConfigured(): boolean {
  return Boolean(config.STRIPE_SECRET_KEY && config.STRIPE_PRICE_GROWTH && config.STRIPE_PRICE_SCALE);
}

export async function getBillingStatus(businessId: string) {
  const snap = await db.doc(`businesses/${businessId}`).get();
  if (!snap.exists) throw buildError('BUSINESS_NOT_FOUND', 'Business does not exist', 404);
  const data = snap.data() || {};
  const plan = (data.billing?.plan as PlanId) || 'free';
  const def = PLAN_DEFINITIONS[plan] || PLAN_DEFINITIONS.free;

  return {
    configured: isBillingConfigured(),
    plan,
    planName: def.name,
    priceMonthlyUsd: def.priceMonthlyUsd,
    status: data.billing?.status || 'active',
    currentPeriodEnd: data.billing?.currentPeriodEnd || null,
    features: def.features,
    limits: def.limits,
    usage: {
      periodStart: data.usage?.periodStart || null,
      messages: Number(data.usage?.messages || 0),
      aiCalls: Number(data.usage?.aiCalls || 0),
      broadcasts: Number(data.usage?.broadcasts || 0),
    },
    plans: Object.values(PLAN_DEFINITIONS).map(p => ({
      id: p.id,
      name: p.name,
      priceMonthlyUsd: p.priceMonthlyUsd,
      features: p.features,
      limits: p.limits,
    })),
  };
}

async function ensureStripeCustomer(businessId: string, email: string, existingCustomerId?: string) {
  if (existingCustomerId) return existingCustomerId;

  const customer = await stripeForm('/customers', {
    email,
    'metadata[businessId]': businessId,
  });

  await db.doc(`businesses/${businessId}`).set(
    {
      billing: {
        plan: 'free',
        status: 'active',
        stripeCustomerId: customer.id,
      },
    },
    { merge: true }
  );

  return customer.id as string;
}

export async function createCheckoutSession(businessId: string, plan: string, userEmail: string) {
  if (!paidPlan(plan)) {
    throw buildError('INVALID_PLAN', 'Only growth and scale plans support checkout', 422);
  }

  const snap = await db.doc(`businesses/${businessId}`).get();
  if (!snap.exists) throw buildError('BUSINESS_NOT_FOUND', 'Business does not exist', 404);
  const data = snap.data() || {};

  const customerId = await ensureStripeCustomer(businessId, userEmail, data.billing?.stripeCustomerId);
  const priceId = priceIdForPlan(plan);
  const successUrl = `${config.APP_URL}/settings?billing=success`;
  const cancelUrl = `${config.APP_URL}/settings?billing=cancelled`;

  const session = await stripeForm('/checkout/sessions', {
    mode: 'subscription',
    customer: customerId,
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: businessId,
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    'metadata[businessId]': businessId,
    'metadata[plan]': plan,
    'subscription_data[metadata][businessId]': businessId,
    'subscription_data[metadata][plan]': plan,
  });

  return { url: session.url as string, sessionId: session.id as string };
}

export async function createBillingPortalSession(businessId: string) {
  const snap = await db.doc(`businesses/${businessId}`).get();
  if (!snap.exists) throw buildError('BUSINESS_NOT_FOUND', 'Business does not exist', 404);
  const customerId = snap.data()?.billing?.stripeCustomerId;
  if (!customerId) {
    throw buildError('NO_CUSTOMER', 'No Stripe customer for this business yet', 400);
  }

  const session = await stripeForm('/billing_portal/sessions', {
    customer: customerId,
    return_url: `${config.APP_URL}/settings`,
  });

  return { url: session.url as string };
}

function planFromPriceId(priceId: string | undefined): PlanId {
  if (!priceId) return 'free';
  if (priceId === config.STRIPE_PRICE_GROWTH) return 'growth';
  if (priceId === config.STRIPE_PRICE_SCALE) return 'scale';
  return 'free';
}

export async function handleStripeWebhook(rawBody: Buffer, signature: string | undefined) {
  if (!config.STRIPE_WEBHOOK_SECRET) {
    throw buildError('BILLING_NOT_CONFIGURED', 'Stripe webhook secret not configured', 503);
  }
  if (!signature) {
    throw buildError('UNAUTHORIZED', 'Missing Stripe-Signature header', 401);
  }

  // Verify signature without the Stripe SDK (HMAC SHA256 of timestamp + body).
  const crypto = await import('crypto');
  const parts = Object.fromEntries(
    signature.split(',').map(p => {
      const [k, v] = p.split('=');
      return [k, v];
    })
  );
  const timestamp = parts.t;
  const expected = parts.v1;
  if (!timestamp || !expected) {
    throw buildError('UNAUTHORIZED', 'Invalid Stripe signature format', 401);
  }
  const payload = `${timestamp}.${rawBody.toString('utf8')}`;
  const digest = crypto.createHmac('sha256', config.STRIPE_WEBHOOK_SECRET).update(payload).digest('hex');
  const a = Buffer.from(digest);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw buildError('UNAUTHORIZED', 'Invalid Stripe signature', 401);
  }

  // Reject stale timestamps (>5 min)
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
    throw buildError('UNAUTHORIZED', 'Stripe signature timestamp too old', 401);
  }

  const event = JSON.parse(rawBody.toString('utf8')) as {
    type: string;
    data: { object: Record<string, any> };
  };

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const businessId = session.client_reference_id || session.metadata?.businessId;
      const plan = (session.metadata?.plan as PlanId) || 'growth';
      if (businessId) {
        await db.doc(`businesses/${businessId}`).set(
          {
            billing: {
              plan: paidPlan(plan) ? plan : 'growth',
              status: 'active',
              stripeCustomerId: session.customer,
              stripeSubscriptionId: session.subscription,
              updatedAt: new Date().toISOString(),
            },
          },
          { merge: true }
        );
      }
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.created': {
      const sub = event.data.object;
      const businessId = sub.metadata?.businessId;
      const priceId = sub.items?.data?.[0]?.price?.id as string | undefined;
      const plan = (sub.metadata?.plan as PlanId) || planFromPriceId(priceId);
      if (businessId) {
        await db.doc(`businesses/${businessId}`).set(
          {
            billing: {
              plan,
              status: sub.status === 'active' || sub.status === 'trialing' ? 'active' : sub.status,
              stripeCustomerId: sub.customer,
              stripeSubscriptionId: sub.id,
              currentPeriodEnd: sub.current_period_end
                ? new Date(sub.current_period_end * 1000).toISOString()
                : null,
              updatedAt: new Date().toISOString(),
            },
          },
          { merge: true }
        );
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const businessId = sub.metadata?.businessId;
      if (businessId) {
        await db.doc(`businesses/${businessId}`).set(
          {
            billing: {
              plan: 'free',
              status: 'canceled',
              stripeSubscriptionId: null,
              updatedAt: new Date().toISOString(),
            },
          },
          { merge: true }
        );
      }
      break;
    }
    default:
      logger.info({ type: event.type }, 'Unhandled Stripe webhook event');
  }

  return { received: true };
}
