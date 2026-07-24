import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../config/firebase.js';
import { PLAN_DEFINITIONS, PlanId, isWithinLimit } from '../../../shared/plans.js';
import { buildError } from '../utils/errors.js';

export type UsageMetric = 'messages' | 'aiCalls' | 'broadcasts';

export interface UsageSnapshot {
  periodStart: string;
  messages: number;
  aiCalls: number;
  broadcasts: number;
}

function currentPeriodStart(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function normalizePlan(raw: unknown): PlanId {
  if (raw === 'growth' || raw === 'scale' || raw === 'enterprise' || raw === 'free') return raw;
  return 'free';
}

export async function getBusinessBilling(businessId: string) {
  const snap = await db.doc(`businesses/${businessId}`).get();
  if (!snap.exists) {
    throw buildError('BUSINESS_NOT_FOUND', 'Business does not exist', 404);
  }
  const data = snap.data() || {};
  const plan = normalizePlan(data.billing?.plan);
  const usage: UsageSnapshot = {
    periodStart: data.usage?.periodStart || currentPeriodStart(),
    messages: Number(data.usage?.messages || 0),
    aiCalls: Number(data.usage?.aiCalls || 0),
    broadcasts: Number(data.usage?.broadcasts || 0),
  };

  // Roll usage into a new month bucket when the period changes.
  if (usage.periodStart !== currentPeriodStart()) {
    const reset: UsageSnapshot = {
      periodStart: currentPeriodStart(),
      messages: 0,
      aiCalls: 0,
      broadcasts: 0,
    };
    await snap.ref.set({ usage: reset }, { merge: true });
    return {
      plan,
      billingStatus: data.billing?.status || 'active',
      usage: reset,
      limits: PLAN_DEFINITIONS[plan].limits,
      planName: PLAN_DEFINITIONS[plan].name,
    };
  }

  return {
    plan,
    billingStatus: data.billing?.status || 'active',
    usage,
    limits: PLAN_DEFINITIONS[plan].limits,
    planName: PLAN_DEFINITIONS[plan].name,
  };
}

export async function assertWithinPlanLimit(businessId: string, metric: UsageMetric) {
  const { plan, usage, limits } = await getBusinessBilling(businessId);
  const used =
    metric === 'messages' ? usage.messages : metric === 'aiCalls' ? usage.aiCalls : usage.broadcasts;
  const limit =
    metric === 'messages'
      ? limits.messagesPerMonth
      : metric === 'aiCalls'
        ? limits.aiCallsPerMonth
        : limits.broadcastsPerMonth;

  if (!isWithinLimit(used, limit)) {
    throw buildError(
      'PLAN_LIMIT_REACHED',
      `Monthly ${metric} limit reached for plan "${plan}". Upgrade to continue.`,
      402
    );
  }
}

export async function incrementUsage(businessId: string, metric: UsageMetric, by = 1) {
  const periodStart = currentPeriodStart();
  const ref = db.doc(`businesses/${businessId}`);
  const snap = await ref.get();
  const data = snap.data() || {};
  const existingPeriod = data.usage?.periodStart;

  if (existingPeriod !== periodStart) {
    await ref.set(
      {
        usage: {
          periodStart,
          messages: metric === 'messages' ? by : 0,
          aiCalls: metric === 'aiCalls' ? by : 0,
          broadcasts: metric === 'broadcasts' ? by : 0,
        },
      },
      { merge: true }
    );
    return;
  }

  const field =
    metric === 'messages' ? 'usage.messages' : metric === 'aiCalls' ? 'usage.aiCalls' : 'usage.broadcasts';
  await ref.update({ [field]: FieldValue.increment(by) });
}

export async function assertAgentSeatAvailable(businessId: string) {
  const { plan, limits } = await getBusinessBilling(businessId);
  if (limits.agents < 0) return;

  const agentsSnap = await db.collection(`businesses/${businessId}/agents`).get();
  if (agentsSnap.size >= limits.agents) {
    throw buildError(
      'PLAN_LIMIT_REACHED',
      `Agent seat limit reached for plan "${plan}". Upgrade to invite more teammates.`,
      402
    );
  }
}
