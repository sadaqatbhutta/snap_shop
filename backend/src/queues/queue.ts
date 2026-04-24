import { Queue, Worker, Job, JobsOptions } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

const isProduction = config.NODE_ENV === 'production';
const isStaging = process.env.STAGING === 'true' || config.NODE_ENV === 'staging';
const inlineWorkersConfigured =
  process.env.INLINE_WORKERS_IN_SERVER === 'true' ||
  (config.NODE_ENV === 'development' && process.env.INLINE_WORKERS_IN_SERVER !== 'false');

// ─── Redis Connection with Retry & Version Check ─────────────────────────────
function createRedisConnection(): Redis | null {
  if (!isProduction && !isStaging) {
    logger.info('Development mode: using in-memory queue fallback');
    return null;
  }

  try {
    const redisOptions: import('ioredis').RedisOptions = {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      retryStrategy: (times: number) => {
        if (times > 10) {
          logger.error('Redis connection failed after 10 retries');
          return null; // Stop retrying
        }
        const delay = Math.min(times * 100, 3000);
        logger.warn({ attempt: times, delay }, 'Retrying Redis connection');
        return delay;
      },
      reconnectOnError: (err: Error) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          logger.warn('Redis is in READONLY mode, reconnecting');
          return true;
        }
        return false;
      },
    };

    // Parse REDIS_URL for TLS (common in staging/production)
    if (config.REDIS_URL.startsWith('rediss://')) {
      redisOptions.tls = {
        // In production, validate certificates properly
        rejectUnauthorized: config.NODE_ENV === 'production',
        // In staging, allow self-signed certs
        ...(config.NODE_ENV !== 'production' && { rejectUnauthorized: false }),
      };
      
      logger.info({ 
        env: config.NODE_ENV, 
        validateCerts: config.NODE_ENV === 'production' 
      }, 'Redis TLS enabled');
    }

    const redis = new Redis(config.REDIS_URL, redisOptions);

    redis.on('error', (err: Error) => {
      logger.error({ error: err.message }, 'Redis connection error');
    });

    redis.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redis.on('ready', async () => {
      try {
        // Check Redis version (BullMQ requires 6.2+)
        const info = await redis.info('server');
        const versionMatch = info.match(/redis_version:(\d+\.\d+\.\d+)/);
        if (versionMatch) {
          const version = versionMatch[1];
          const [major, minor] = version.split('.').map(Number);
          
          if (major < 6 || (major === 6 && minor < 2)) {
            logger.error(
              { version, required: '6.2+' },
              'Redis version too old for BullMQ. Please upgrade Redis.'
            );
            redis.disconnect();
            return;
          }
          
          logger.info({ version }, 'Redis version check passed');
        }
      } catch (err) {
        logger.warn({ error: (err as Error).message }, 'Could not verify Redis version');
      }
    });

    return redis;
  } catch (err) {
    logger.error({ error: (err as Error).message }, 'Failed to create Redis connection');
    return null;
  }
}

export const connection = createRedisConnection();

export const defaultJobOptions: JobsOptions = {
  attempts: config.QUEUE_MAX_RETRIES,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: { age: 3600 },
  removeOnFail: false,
};

// ─── In-Memory Fallback Queue (Development) ───────────────────────────────────
type InMemoryJobState = 'waiting' | 'delayed' | 'active' | 'completed' | 'failed';
type InMemoryJobRecord<T> = {
  id: string;
  name: string;
  data: T;
  status: InMemoryJobState;
  result: unknown;
  failedReason: string | null;
  attemptsMade: number;
  timestamp: number;
};

class InMemoryQueue<T> {
  private jobs: Map<string, InMemoryJobRecord<T>> = new Map();
  private processor: ((job: Job<T>) => Promise<unknown>) | null = null;

  constructor(public name: string) {
    logger.warn(
      { queue: name, service: 'snapshop-backend' },
      '⚠️  IN-MEMORY QUEUE ACTIVE - jobs run in-process for development only.'
    );
  }

  setProcessor(processor: (job: Job<T>) => Promise<unknown>) {
    this.processor = processor;
  }

  private async processJob(job: InMemoryJobRecord<T>) {
    if (!this.processor) {
      logger.warn({ queue: this.name, job_id: job.id }, 'In-memory queue has no processor yet');
      return;
    }
    job.status = 'active';
    job.attemptsMade += 1;
    try {
      const fakeJob = { id: job.id, data: job.data } as Job<T>;
      job.result = await this.processor(fakeJob);
      job.status = 'completed';
      logger.info({ queue: this.name, job_id: job.id }, 'In-memory job completed');
    } catch (err) {
      job.status = 'failed';
      job.failedReason = (err as Error).message;
      logger.error({ queue: this.name, job_id: job.id, error: job.failedReason }, 'In-memory job failed');
    }
  }

  async add(jobName: string, data: T, opts?: JobsOptions) {
    const id = `dev-${this.name}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const delay = opts?.delay ?? 0;
    const job: InMemoryJobRecord<T> = {
      id,
      name: jobName,
      data,
      status: delay > 0 ? 'delayed' : 'waiting',
      result: null,
      failedReason: null,
      attemptsMade: 0,
      timestamp: Date.now(),
    };
    this.jobs.set(id, job);

    setTimeout(() => {
      void this.processJob(job);
    }, delay);

    return job;
  }

  async getWaitingCount() {
    let waiting = 0;
    this.jobs.forEach(job => {
      if (job.status === 'waiting' || job.status === 'delayed') waiting += 1;
    });
    return waiting;
  }

  async getJob(id: string) {
    return this.jobs.get(id) || null;
  }
}

// ─── Queue Factory ────────────────────────────────────────────────────────────
function createQueue<T>(name: string) {
  if (!connection) {
    const level = isProduction || isStaging ? 'error' : 'warn';
    logger[level](
      { queue: name, service: 'snapshop-backend', inlineWorkersConfigured },
      isProduction || isStaging
        ? '🚨 CRITICAL: Redis unavailable in non-dev environment; queue processing is degraded.'
        : 'Using in-memory fallback queue. Jobs process only when workers are running in this runtime.'
    );
    return new InMemoryQueue<T>(name);
  }

  return new Queue<T>(name, { 
    connection: connection as Redis,
    defaultJobOptions,
  });
}

export const emrQueue = createQueue<EMRJobData>('emr');
export const webhookQueue = createQueue<WebhookJobData>('webhook');
export const broadcastQueue = createQueue<BroadcastJobData>('broadcast');

export function getQueueRuntimeInfo() {
  const mode = connection ? 'redis' : 'in-memory';
  return {
    mode,
    redisConnected: Boolean(connection),
    inlineWorkersConfigured,
    environment: config.NODE_ENV,
    healthy: mode === 'redis' || (!isProduction && !isStaging),
  };
}

// ─── Job Data Types ───────────────────────────────────────────────────────────
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

// ─── Job Status Query ─────────────────────────────────────────────────────────
export async function getJobStatus(queue: Queue | InMemoryQueue<any>, jobId: string) {
  // In-memory queue
  if (queue instanceof InMemoryQueue) {
    const job = await queue.getJob(jobId);
    if (!job) return null;
    return {
      id: job.id,
      state: job.status,
      data: job.data,
      result: null,
      failedReason: null,
      attemptsMade: 0,
      timestamp: new Date().toISOString(),
    };
  }

  // BullMQ queue
  if (!('client' in queue)) {
    return null;
  }

  try {
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
  } catch (err) {
    logger.error({ error: (err as Error).message, jobId }, 'Failed to get job status');
    return null;
  }
}

// ─── Worker Factory ───────────────────────────────────────────────────────────
export function createWorker<T>(queueName: string, processor: (job: Job<T>) => Promise<unknown>) {
  if (!connection) {
    logger.warn({ queue: queueName }, 'Using in-memory worker in development');
    const queueMap: Record<string, InMemoryQueue<any>> = {
      emr: emrQueue as InMemoryQueue<any>,
      webhook: webhookQueue as InMemoryQueue<any>,
      broadcast: broadcastQueue as InMemoryQueue<any>,
    };
    const targetQueue = queueMap[queueName];
    if (targetQueue) {
      targetQueue.setProcessor(processor as (job: Job<any>) => Promise<unknown>);
    }
    return {
      on: () => undefined,
      close: async () => undefined,
    } as unknown as Worker<T>;
  }

  const worker = new Worker<T>(queueName, processor, {
    connection,
    concurrency: config.QUEUE_CONCURRENCY,
    autorun: true,
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
        stack: err?.stack,
      },
      'Worker job failed'
    );
  });

  worker.on('error', err => {
    logger.error({ queue: queueName, error: err.message }, 'Worker error');
  });

  return worker;
}

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
export async function closeQueues() {
  if (connection) {
    logger.info('Closing Redis connection');
    await connection.quit();
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing queues');
  await closeQueues();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing queues');
  await closeQueues();
  process.exit(0);
});
