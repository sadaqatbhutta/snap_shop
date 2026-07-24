import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/firebase.js';

export type WorkflowAction =
  | 'escalate'
  | 'tag_hot'
  | 'tag_urgent'
  | 'assign_sales'
  | 'assign_support'
  | 'assign_billing'
  | 'skip_ai'
  | 'add_tag';

export type WorkflowRule = {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  match: {
    intentContains?: string[];
    messageContains?: string[];
    channel?: string[];
    confidenceBelow?: number;
  };
  actions: WorkflowAction[];
  tagToAdd?: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkflowDecision = {
  matchedRules: string[];
  shouldEscalate: boolean;
  skipAi: boolean;
  assignedQueue?: 'sales' | 'support' | 'billing';
  tags: string[];
  leadPriorityBoost?: 'hot' | 'urgent';
};

const DEFAULT_RULES: Omit<WorkflowRule, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Escalate complaints',
    enabled: true,
    priority: 10,
    match: { messageContains: ['refund', 'complaint', 'lawyer', 'scam', 'fraud'] },
    actions: ['escalate', 'tag_urgent', 'assign_support'],
  },
  {
    name: 'Sales intent to sales queue',
    enabled: true,
    priority: 20,
    match: { intentContains: ['purchase', 'buy', 'pricing', 'order'], messageContains: ['buy', 'price', 'order now'] },
    actions: ['assign_sales', 'tag_hot'],
  },
  {
    name: 'Billing questions',
    enabled: true,
    priority: 30,
    match: { intentContains: ['billing', 'invoice', 'payment'], messageContains: ['invoice', 'payment', 'billing'] },
    actions: ['assign_billing'],
  },
  {
    name: 'Low confidence escalate',
    enabled: true,
    priority: 40,
    match: { confidenceBelow: 0.55 },
    actions: ['escalate'],
  },
];

export async function ensureDefaultWorkflows(businessId: string): Promise<void> {
  const snap = await db.collection(`businesses/${businessId}/workflows`).limit(1).get();
  if (!snap.empty) return;
  const now = new Date().toISOString();
  const batch = db.batch();
  for (const rule of DEFAULT_RULES) {
    const id = uuidv4();
    batch.set(db.doc(`businesses/${businessId}/workflows/${id}`), {
      ...rule,
      id,
      createdAt: now,
      updatedAt: now,
    });
  }
  await batch.commit();
}

export async function listWorkflows(businessId: string): Promise<WorkflowRule[]> {
  await ensureDefaultWorkflows(businessId);
  const snap = await db.collection(`businesses/${businessId}/workflows`).orderBy('priority', 'asc').get();
  return snap.docs.map(d => d.data() as WorkflowRule);
}

export async function upsertWorkflow(
  businessId: string,
  rule: Partial<WorkflowRule> & { name: string; actions: WorkflowAction[] }
): Promise<WorkflowRule> {
  const now = new Date().toISOString();
  const id = rule.id || uuidv4();
  const doc: WorkflowRule = {
    id,
    name: rule.name,
    enabled: rule.enabled ?? true,
    priority: rule.priority ?? 100,
    match: rule.match || {},
    actions: rule.actions,
    tagToAdd: rule.tagToAdd,
    createdAt: rule.createdAt || now,
    updatedAt: now,
  };
  await db.doc(`businesses/${businessId}/workflows/${id}`).set(doc, { merge: true });
  return doc;
}

export async function deleteWorkflow(businessId: string, ruleId: string): Promise<void> {
  await db.doc(`businesses/${businessId}/workflows/${ruleId}`).delete();
}

export function evaluateWorkflows(
  rules: WorkflowRule[],
  input: { message: string; intent?: string; channel?: string; confidence?: number }
): WorkflowDecision {
  const lower = input.message.toLowerCase();
  const intent = (input.intent || '').toLowerCase();
  const matchedRules: string[] = [];
  const tags: string[] = [];
  let shouldEscalate = false;
  let skipAi = false;
  let assignedQueue: WorkflowDecision['assignedQueue'];
  let leadPriorityBoost: WorkflowDecision['leadPriorityBoost'];

  const enabled = [...rules].filter(r => r.enabled).sort((a, b) => a.priority - b.priority);

  for (const rule of enabled) {
    const m = rule.match || {};
    let ok = true;
    if (m.messageContains?.length) {
      ok = m.messageContains.some(k => lower.includes(k.toLowerCase()));
    }
    if (ok && m.intentContains?.length) {
      ok = m.intentContains.some(k => intent.includes(k.toLowerCase()) || lower.includes(k.toLowerCase()));
    }
    if (ok && m.channel?.length && input.channel) {
      ok = m.channel.includes(input.channel);
    }
    if (ok && typeof m.confidenceBelow === 'number' && typeof input.confidence === 'number') {
      ok = input.confidence < m.confidenceBelow;
    }
    // Rules that only have confidenceBelow should still match when confidence provided
    if (!m.messageContains?.length && !m.intentContains?.length && !m.channel?.length && typeof m.confidenceBelow !== 'number') {
      ok = false;
    }

    if (!ok) continue;
    matchedRules.push(rule.name);

    for (const action of rule.actions) {
      if (action === 'escalate') shouldEscalate = true;
      if (action === 'skip_ai') skipAi = true;
      if (action === 'tag_hot') {
        tags.push('hot');
        leadPriorityBoost = 'hot';
      }
      if (action === 'tag_urgent') {
        tags.push('urgent');
        leadPriorityBoost = 'urgent';
      }
      if (action === 'assign_sales') assignedQueue = 'sales';
      if (action === 'assign_support') assignedQueue = 'support';
      if (action === 'assign_billing') assignedQueue = 'billing';
      if (action === 'add_tag' && rule.tagToAdd) tags.push(rule.tagToAdd);
    }
  }

  return {
    matchedRules,
    shouldEscalate,
    skipAi,
    assignedQueue,
    tags: [...new Set(tags)],
    leadPriorityBoost,
  };
}
