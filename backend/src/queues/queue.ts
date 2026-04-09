import { Queue, Worker, Job, JobsOptions } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

const isProduction = config.NODE_ENV === 'production';
const isStaging = process.env.STAGING === 'true' || config.NODE_ENV === 'staging';

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
class InMemoryQueue<T> {
  private jobs: Map<string, { id: string; data: T; status: string }> = new Map();

  constructor(public name: string) {}

  async add(_name: string, data: T, _opts?: JobsOptions) {
    const id = `dev-${this.name}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const job = { id, data, status: 'completed' };
    this.jobs.set(id, job);
    
    logger.warn(
      { queue: this.name, job_id: id, service: 'snapshop-backend' },
      'Using in-memory fallback queue because Redis is unavailable'
    );
    
    // Simulate async processing
    setTimeout(() => {
      logger.info({ queue: this.name, job_id: id }, 'In-memory job completed');
    }, 100);
    
    return job;
  }

  async getWaitingCount() {
    return 0;
  }

  async getJob(id: string) {
    return this.jobs.get(id) || null;
  }
}

// ─── Queue Factory ────────────────────────────────────────────────────────────
function createQueue<T>(name: string) {
  if (!connection) {
    logger.warn(
      { queue: name, service: 'snapshop-backend' },
      'Using in-memory fallback queue because Redis is unavailable'
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
    logger.warn(
      { queue: queueName, service: 'snapshop-backend' },
      'Using in-memory fallback worker because Redis is unavailable'
    );
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
