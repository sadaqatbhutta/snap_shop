import { createWorker, WebhookJobData, BroadcastJobData, DigestJobData } from './src/queues/queue.js';
import { processWebhookJob } from './src/services/webhook.service.js';
import { processBroadcastJob } from './src/services/broadcast.service.js';
import { processDigestJob, scheduleDigestJobs } from './src/services/notification.service.js';
import { logger } from './src/utils/logger.js';
import { fileURLToPath } from 'url';

let workersStarted = false;

export function startWorkers() {
  if (workersStarted) return;
  workersStarted = true;

  createWorker<WebhookJobData>('webhook', async job => {
    logger.info({ queue: 'webhook', job_id: job.id, event: 'processing', request_id: job.data.requestId, channel: job.data.channel }, 'Webhook job started');
    return processWebhookJob(job.data.channel, job.data.body);
  });

  createWorker<BroadcastJobData>('broadcast', async job => {
    logger.info({ queue: 'broadcast', job_id: job.id, event: 'processing', request_id: job.data.requestId, broadcast_id: job.data.broadcastId }, 'Broadcast job started');
    return processBroadcastJob(job.data);
  });

  createWorker<DigestJobData>('digest', async job => {
    logger.info({ queue: 'digest', job_id: job.id, frequency: job.data.frequency }, 'Digest job started');
    return processDigestJob(job.data.frequency);
  });

  void scheduleDigestJobs();

  logger.info({ message: 'BullMQ workers started', queues: ['webhook', 'broadcast', 'digest'] });
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  startWorkers();
}
