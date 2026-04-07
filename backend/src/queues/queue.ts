import { Queue, Worker, Job, JobsOptions } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

export const connection = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

connection.on('error', err => {
  logger.warn({ error: err?.message ?? String(err) }, 'Redis connection error');
});

export const defaultJobOptions: JobsOptions = {
  attempts: config.QUEUE_MAX_RETRIES,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: { age: 3600 },
  removeOnFail: false,
};

function createQueue<T>(name: string) {
  return new Queue<T>(name, { connection: connection as Redis.Redis });
}

export const emrQueue = createQueue<EMRJobData>('emr');
export const webhookQueue = createQueue<WebhookJobData>('webhook');
export const broadcastQueue = createQueue<BroadcastJobData>('broadcast');

export type EMRJobData = {
  path: string;
  payload: unknown;
  requestId?: string;
};

export type WebhookJobData = {
  channel: string;
  body: Record<string, unknown>;
  requestId?: string;
};

export type BroadcastJobData = {
  broadcastId: string;
  businessId: string;
  requestId?: string;
};

export async function getJobStatus(queue: Queue | { add?: unknown }, jobId: string) {
  if (!('client' in queue)) {
    return null;
  }

  const job = await Job.fromId(queue as Queue, jobId);
  if (!job) return null;
  const state = await job.getState();
  return {
    id: job.id,
    state,
    data: job.data,
    result: job.returnvalue ?? null,
    failedReason: job.failedReason ?? null,
    attemptsMade: job.attemptsMade,
    timestamp: new Date(job.timestamp).toISOString(),
  };
}

export function createWorker<T>(queueName: string, processor: (job: Job<T>) => Promise<unknown>) {
  const worker = new Worker<T>(queueName, processor, {
    connection,
    concurrency: config.QUEUE_CONCURRENCY,
  });

  worker.on('completed', job => {
    logger.info({ queue: queueName, job_id: job.id, event: 'completed' }, 'Worker completed job');
  });

  worker.on('failed', (job, err) => {
    logger.error(
      {
        queue: queueName,
        job_id: job?.id,
        event: 'failed',
        attempt: job?.attemptsMade,
        error: err?.message,
      },
      'Worker job failed'
    );
  });

  return worker;
}
