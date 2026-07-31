import { db } from '../config/firebase.js';
import { logger } from '../utils/logger.js';

/** Empty string is queryable in Firestore (missing/null fields are not). */
export const UNASSIGNED_AGENT_ID = '';

export async function listAssignableAgentIds(businessId: string): Promise<string[]> {
  const agentsSnap = await db.collection(`businesses/${businessId}/agents`).get();
  return agentsSnap.docs.map((d) => d.id);
}

/**
 * Pick the agent with the fewest open (active / escalated) conversations.
 * Returns null when the team has no agent seats.
 */
export async function pickLeastLoadedAgent(businessId: string): Promise<string | null> {
  const agentIds = await listAssignableAgentIds(businessId);
  if (agentIds.length === 0) return null;

  const openSnap = await db
    .collection(`businesses/${businessId}/conversations`)
    .where('status', 'in', ['active', 'human_escalated'])
    .orderBy('updatedAt', 'desc')
    .limit(200)
    .get();

  const load = new Map<string, number>(agentIds.map((id) => [id, 0]));
  for (const docSnap of openSnap.docs) {
    const aid = docSnap.data().assignedAgentId;
    if (typeof aid === 'string' && aid && load.has(aid)) {
      load.set(aid, (load.get(aid) || 0) + 1);
    }
  }

  let bestId = agentIds[0];
  let bestCount = Number.POSITIVE_INFINITY;
  for (const id of agentIds) {
    const count = load.get(id) ?? 0;
    if (count < bestCount) {
      bestCount = count;
      bestId = id;
    }
  }
  return bestId;
}

/**
 * Round-robin / least-loaded assign when escalating an unassigned chat.
 * Does not overwrite an existing assignee unless `force` is true.
 */
export async function autoAssignIfUnassigned(
  businessId: string,
  conversationId: string,
  opts: { force?: boolean } = {},
): Promise<string | null> {
  const ref = db.doc(`businesses/${businessId}/conversations/${conversationId}`);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const current = snap.data()?.assignedAgentId;
  if (!opts.force && typeof current === 'string' && current.length > 0) {
    return current;
  }

  const agentId = await pickLeastLoadedAgent(businessId);
  if (!agentId) {
    logger.info({ businessId, conversationId }, 'No agents available for auto-assign');
    return null;
  }

  await ref.update({
    assignedAgentId: agentId,
    updatedAt: new Date().toISOString(),
  });

  logger.info({ businessId, conversationId, agentId }, 'Auto-assigned conversation to least-loaded agent');
  return agentId;
}
