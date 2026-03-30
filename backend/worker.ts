/**
 * BullMQ Worker Process
 * ─────────────────────────────────────────────
 * Run independently from the API server:
 *   npm run worker
 *
 * Processes jobs from:
 *   - emr    queue  → posts data to EMR API (with retry)
 *   - webhook queue → runs the full message pipeline
 */

import { Job } from 'bullmq';
import { createWorker, EMRJobData, WebhookJobData } from './core/queue';
import { postToEMR } from './services/emr_service';
import { processWebhookJob } from './services/webhook_service';
import { log } from './core/logger';

// ─── EMR Worker ───────────────────────────────────────────────────────────────
createWorker<EMRJobData>('emr', async (job: Job<EMRJobData>) => {
  log({
    timestamp: new Date().toISOString(),
    level: 'info',
    queue: 'emr',
    job_id: job.id,
    event: 'processing',
    request_id: job.data.requestId,
    path: job.data.path,
  });

  return postToEMR(job.data.path, job.data.payload);
});

// ─── Webhook Worker ───────────────────────────────────────────────────────────
createWorker<WebhookJobData>('webhook', async (job: Job<WebhookJobData>) => {
  log({
    timestamp: new Date().toISOString(),
    level: 'info',
    queue: 'webhook',
    job_id: job.id,
    event: 'processing',
    request_id: job.data.requestId,
    channel: job.data.channel,
  });

  return processWebhookJob(job.data.channel, job.data.body);
});

log({
  timestamp: new Date().toISOString(),
  level: 'info',
  message: '⚙️  BullMQ workers started — listening on [emr, webhook] queues',
});
