/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PlanId = 'free' | 'growth' | 'scale' | 'enterprise';

export interface PlanLimits {
  messagesPerMonth: number;
  aiCallsPerMonth: number;
  broadcastsPerMonth: number;
  agents: number;
  /** -1 means unlimited */
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  priceMonthlyUsd: number | null;
  stripePriceEnvKey?: 'STRIPE_PRICE_GROWTH' | 'STRIPE_PRICE_SCALE';
  limits: PlanLimits;
  features: string[];
}

/** -1 = unlimited */
export const PLAN_DEFINITIONS: Record<PlanId, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free',
    priceMonthlyUsd: 0,
    limits: {
      messagesPerMonth: 500,
      aiCallsPerMonth: 100,
      broadcastsPerMonth: 2,
      agents: 2,
    },
    features: ['Webchat inbox', 'Basic AI replies', '1 team invite'],
  },
  growth: {
    id: 'growth',
    name: 'Growth Pro',
    priceMonthlyUsd: 79,
    stripePriceEnvKey: 'STRIPE_PRICE_GROWTH',
    limits: {
      messagesPerMonth: 10_000,
      aiCallsPerMonth: 2_000,
      broadcastsPerMonth: 20,
      agents: 5,
    },
    features: [
      'Multi-channel inbox',
      'AI replies + escalation',
      'RAG knowledge base',
      'AI tools + workflows',
      'Multimodal (image/voice)',
      'Segments, templates, broadcasts',
      'Team access',
      'Analytics',
    ],
  },
  scale: {
    id: 'scale',
    name: 'Scale Plus',
    priceMonthlyUsd: 149,
    stripePriceEnvKey: 'STRIPE_PRICE_SCALE',
    limits: {
      messagesPerMonth: 50_000,
      aiCallsPerMonth: 10_000,
      broadcastsPerMonth: 100,
      agents: 20,
    },
    features: [
      'Everything in Growth Pro',
      'Higher message limits',
      'CRM AI copilot',
      'Shopify / Woo commerce tools',
      'Priority support',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    priceMonthlyUsd: null,
    limits: {
      messagesPerMonth: -1,
      aiCallsPerMonth: -1,
      broadcastsPerMonth: -1,
      agents: -1,
    },
    features: [
      'Custom limits',
      'Dedicated success manager',
      'Advanced workflow customization',
    ],
  },
};

export function isWithinLimit(used: number, limit: number): boolean {
  if (limit < 0) return true;
  return used < limit;
}
