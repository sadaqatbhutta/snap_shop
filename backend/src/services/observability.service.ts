import { queryLogs } from '../utils/logStore.js';
import { getMetrics as getMetricsInternal } from '../utils/metrics.js';
import { emrQueue, webhookQueue, broadcastQueue } from '../queues/queue.js';

export function queryLogsForDashboard(query: Record<string, unknown>) {
  return queryLogs(query as any);
}

export function getMetrics() {
  return getMetricsInternal();
}

export async function healthCheck() {
  const [emrWaiting, webhookWaiting, broadcastWaiting] = await Promise.allSettled([
    emrQueue.getWaitingCount(),
    webhookQueue.getWaitingCount(),
    broadcastQueue.getWaitingCount(),
  ]);

  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime_s: Math.floor(process.uptime()),
    queues: {
      emr: emrWaiting.status === 'fulfilled' ? { waiting: emrWaiting.value } : { error: 'unavailable' },
      webhook: webhookWaiting.status === 'fulfilled' ? { waiting: webhookWaiting.value } : { error: 'unavailable' },
      broadcast: broadcastWaiting.status === 'fulfilled' ? { waiting: broadcastWaiting.value } : { error: 'unavailable' },
    },
  };
}
