import { queryLogs } from '../utils/logStore.js';
import { getMetrics as getMetricsInternal } from '../utils/metrics.js';
import { webhookQueue, broadcastQueue, digestQueue, getQueueRuntimeInfo } from '../queues/queue.js';
import { config } from '../config/config.js';
import { isBillingConfigured } from './billing.service.js';
import { isEmailConfigured } from './email.service.js';

export function isMetaOAuthConfigured(): boolean {
  return Boolean(config.META_APP_ID && config.META_APP_SECRET);
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
    metaOAuthConfigured: isMetaOAuthConfigured(),
  };
}

export async function healthCheck() {
  const queueRuntime = getQueueRuntimeInfo();
  const [webhookWaiting, broadcastWaiting, digestWaiting] = await Promise.allSettled([
    webhookQueue.getWaitingCount(),
    broadcastQueue.getWaitingCount(),
    digestQueue.getWaitingCount(),
  ]);

  return {
    status: queueRuntime.healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime_s: Math.floor(process.uptime()),
    queueRuntime,
    integrations: {
      billing: { configured: isBillingConfigured() },
      email: { configured: isEmailConfigured() },
      metaOAuth: { configured: isMetaOAuthConfigured() },
      metaFallback: { configured: Boolean(config.META_ACCESS_TOKEN && config.WHATSAPP_PHONE_NUMBER_ID) },
    },
    queues: {
      webhook: webhookWaiting.status === 'fulfilled' ? { waiting: webhookWaiting.value } : { error: 'unavailable' },
      broadcast: broadcastWaiting.status === 'fulfilled' ? { waiting: broadcastWaiting.value } : { error: 'unavailable' },
      digest: digestWaiting.status === 'fulfilled' ? { waiting: digestWaiting.value } : { error: 'unavailable' },
    },
  };
}
