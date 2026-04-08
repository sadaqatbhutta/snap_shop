import { createApp } from './app.js';
import { config } from './src/config/config.js';
import { logger } from './src/utils/logger.js';
import { fileURLToPath } from 'url';

async function startServer() {
  const app = await createApp();

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
