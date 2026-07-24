import { queryLogs } from '../utils/logStore.js';
import { getMetrics as getMetricsInternal } from '../utils/metrics.js';
import { emrQueue, webhookQueue, broadcastQueue, getQueueRuntimeInfo } from '../queues/queue.js';
import { config } from '../config/config.js';
import { isBillingConfigured } from './billing.service.js';
import { isEmailConfigured } from './email.service.js';

/** True when EMR_API_URL points at a real host (not template .example.com defaults). */
export function isEmrIntegrationConfigured(): boolean {
  try {
    const host = new URL(config.EMR_API_URL).hostname.toLowerCase();
    if (host === 'emr.example.com') return false;
    if (host.endsWith('.example.com')) return false;
    return true;
  } catch {
    return false;
  }
}

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
    billingConfigured: isBillingConfigured(),
    emailConfigured: isEmailConfigured(),
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
    integrations: {
      emr: { configured: isEmrIntegrationConfigured() },
      billing: { configured: isBillingConfigured() },
      email: { configured: isEmailConfigured() },
      metaFallback: { configured: Boolean(config.META_ACCESS_TOKEN && config.WHATSAPP_PHONE_NUMBER_ID) },
    },
    queues: {
      emr: emrWaiting.status === 'fulfilled' ? { waiting: emrWaiting.value } : { error: 'unavailable' },
      webhook: webhookWaiting.status === 'fulfilled' ? { waiting: webhookWaiting.value } : { error: 'unavailable' },
      broadcast: broadcastWaiting.status === 'fulfilled' ? { waiting: broadcastWaiting.value } : { error: 'unavailable' },
    },
  };
}
