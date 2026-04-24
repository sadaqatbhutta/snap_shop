import { queryLogs } from '../utils/logStore.js';
import { getMetrics as getMetricsInternal } from '../utils/metrics.js';
import { emrQueue, webhookQueue, broadcastQueue, getQueueRuntimeInfo } from '../queues/queue.js';
import { config } from '../config/config.js';

export function queryLogsForDashboard(query: Record<string, unknown>) {
  return queryLogs(query as any);
}

export function getMetrics() {
  return getMetricsInternal();
}

export function runtimeCheck() {
  const queueRuntime = getQueueRuntimeInfo();
  const strictQueueMode = config.QUEUE_STRICT_MODE && config.NODE_ENV !== 'development' && config.NODE_ENV !== 'test';

  return {
    timestamp: new Date().toISOString(),
    uptime_s: Math.floor(process.uptime()),
    environment: config.NODE_ENV,
    queueMode: queueRuntime.mode,
    queueStrictMode: strictQueueMode,
    redisConnected: queueRuntime.redisConnected,
    inlineWorkersEnabled: queueRuntime.inlineWorkersConfigured,
    queueHealthy: queueRuntime.healthy,
  };
}

export async function healthCheck() {
  const queueRuntime = getQueueRuntimeInfo();
  const [emrWaiting, webhookWaiting, broadcastWaiting] = await Promise.allSettled([
    emrQueue.getWaitingCount(),
    webhookQueue.getWaitingCount(),
    broadcastQueue.getWaitingCount(),
  ]);

  return {
    status: queueRuntime.healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime_s: Math.floor(process.uptime()),
    queueRuntime,
    queues: {
      emr: emrWaiting.status === 'fulfilled' ? { waiting: emrWaiting.value } : { error: 'unavailable' },
      webhook: webhookWaiting.status === 'fulfilled' ? { waiting: webhookWaiting.value } : { error: 'unavailable' },
      broadcast: broadcastWaiting.status === 'fulfilled' ? { waiting: broadcastWaiting.value } : { error: 'unavailable' },
    },
  };
}
