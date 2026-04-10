import { db } from '../config/firebase.js';
import { redactForLogs } from '../utils/redact.js';

export async function recordAuditEvent(input: {
  businessId: string;
  actorUid: string;
  action: string;
  meta?: Record<string, unknown>;
}) {
  await db.collection('audit_events').add({
    businessId: input.businessId,
    actorUid: input.actorUid,
    action: input.action,
    meta: input.meta ? redactForLogs(input.meta) : {},
    createdAt: new Date().toISOString(),
  });
}
