import { Queue, Worker, Job } from 'bullmq';
import { config } from './config';
import { log } from './logger';

import Redis from 'ioredis';

// ─── Connection ───────────────────────────────────────────────────────────────
export const connection = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true, // Don't crash immediately if Redis is missing
});

connection.on('error', (err) => {
  // Silent warning for dev
  if (config.NODE_ENV === 'development') {
    console.warn('⚠️  Redis connection failed. Background queues will be inactive.');
  }
});

// ─── Queue Definitions ────────────────────────────────────────────────────────
export const emrQueue    = new Queue('emr',    { connection });
export const webhookQueue = new Queue('webhook', { connection });
export const broadcastQueue = new Queue('broadcast', { connection });

// ─── Job Type Registry ────────────────────────────────────────────────────────
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

// ─── Task Status Tracking ─────────────────────────────────────────────────────
export async function getJobStatus(queue: Queue, jobId: string) {
  const job = await Job.fromId(queue, jobId);
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

// ─── Worker Factory ───────────────────────────────────────────────────────────
// Workers run in a separate process (npm run worker).
// This factory is exported so worker.ts can register processors.
export function createWorker<T>(
  queueName: string,
  processor: (job: Job<T>) => Promise<unknown>
) {
  const worker = new Worker<T>(queueName, processor, {
    connection,
    concurrency: config.QUEUE_CONCURRENCY,
  });

  worker.on('completed', job => {
    log({
      timestamp: new Date().toISOString(),
      level: 'info',
      queue: queueName,
      job_id: job.id,
      event: 'completed',
    });
  });

  worker.on('failed', (job, err) => {
    log({
      timestamp: new Date().toISOString(),
      level: 'error',
      queue: queueName,
      job_id: job?.id,
      event: 'failed',
      attempt: job?.attemptsMade,
      error: err.message,
    });
  });

  return worker;
}
