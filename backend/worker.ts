import { createWorker, EMRJobData, WebhookJobData, BroadcastJobData } from './src/queues/queue.js';
import { getEMRJobProcessor } from './src/services/emr.service.js';
import { processWebhookJob } from './src/services/webhook.service.js';
import { processBroadcastJob } from './src/services/broadcast.service.js';
import { logger } from './src/utils/logger.js';
import { fileURLToPath } from 'url';

let workersStarted = false;

export function startWorkers() {
  if (workersStarted) return;
  workersStarted = true;

  createWorker<EMRJobData>('emr', async job => {
    logger.info({ queue: 'emr', job_id: job.id, event: 'processing', request_id: job.data.requestId, path: job.data.path }, 'EMR job started');
    return getEMRJobProcessor(job.data);
  });

  createWorker<WebhookJobData>('webhook', async job => {
    logger.info({ queue: 'webhook', job_id: job.id, event: 'processing', request_id: job.data.requestId, channel: job.data.channel }, 'Webhook job started');
    return processWebhookJob(job.data.channel, job.data.body);
  });

  createWorker<BroadcastJobData>('broadcast', async job => {
    logger.info({ queue: 'broadcast', job_id: job.id, event: 'processing', request_id: job.data.requestId, broadcast_id: job.data.broadcastId }, 'Broadcast job started');
    return processBroadcastJob(job.data);
  });

  logger.info({ message: 'BullMQ workers started', queues: ['emr', 'webhook', 'broadcast'] });
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  startWorkers();
}
