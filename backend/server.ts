import { createApp } from './app.js';
import { config } from './src/config/config.js';
import { logger } from './src/utils/logger.js';
import { fileURLToPath } from 'url';
import { startWorkers } from './worker.js';
import { getQueueRuntimeInfo } from './src/queues/queue.js';

async function startServer() {
  const queueRuntime = getQueueRuntimeInfo();
  const strictQueueMode = config.QUEUE_STRICT_MODE && config.NODE_ENV !== 'development' && config.NODE_ENV !== 'test';
  const inlineWorkersEnabled =
    process.env.INLINE_WORKERS_IN_SERVER === 'true' ||
    (config.NODE_ENV === 'development' && process.env.INLINE_WORKERS_IN_SERVER !== 'false');

  logger.info(
    {
      environment: config.NODE_ENV,
      queueMode: queueRuntime.mode,
      queueStrictMode: strictQueueMode,
      redisConnected: queueRuntime.redisConnected,
      inlineWorkersEnabled,
      queueHealthy: queueRuntime.healthy,
    },
    'Startup readiness summary'
  );

  if (strictQueueMode && queueRuntime.mode !== 'redis') {
    throw new Error(
      `QUEUE_STRICT_MODE is enabled but queue runtime is "${queueRuntime.mode}". Configure REDIS_URL and restart.`
    );
  }

  const app = await createApp();

  if (inlineWorkersEnabled) {
    startWorkers();
    logger.warn('Workers are running inside server process (development mode)');
  } else {
    logger.warn('Workers are not running in server process. Start "npm run worker" separately.');
  }

  app.listen(config.PORT, '0.0.0.0', () => {
    logger.info({ port: config.PORT }, 'SnapShop backend started');
    if (config.NODE_ENV !== 'production') {
      logger.info({ docsUrl: `http://localhost:${config.PORT}/api/docs` }, 'Swagger UI available');
    }
  });
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  startServer();
}
