import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { config } from './src/config/config.js';
import { apiRouter } from './src/routes/index.js';
import { requestIdMiddleware } from './src/middlewares/requestId.js';
import { requestLogger } from './src/middlewares/requestLogger.js';
import { registerErrorHandlers, notFoundHandler } from './src/middlewares/errorHandler.js';
import { swaggerSpec } from './src/utils/swagger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveFrontendDist(): string {
  return path.resolve(__dirname, '../frontend/dist');
}

function spaBuildAvailable(): boolean {
  const dist = resolveFrontendDist();
  return fs.existsSync(path.join(dist, 'index.html'));
}

export async function createApp() {
  const app = express();

  app.disable('x-powered-by');

  if (config.NODE_ENV === 'production' || config.NODE_ENV === 'staging') {
    app.use(helmet({ contentSecurityPolicy: false }));
  }

  const allowedOrigins = config.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
  app.use(cors({
    origin: (origin, callback) => {
      if (config.NODE_ENV === 'development') return callback(null, true);
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('CORS_NOT_ALLOWED'));
    },
    credentials: true,
  }));

  app.use(bodyParser.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
    limit: '1mb',
  }));

  app.use(requestIdMiddleware);
  app.use(requestLogger);

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
  app.use('/api', apiRouter);

  const frontendDist = resolveFrontendDist();
  if (spaBuildAvailable()) {
    app.use(express.static(frontendDist, { index: false }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(frontendDist, 'index.html'), err => {
        if (err) next(err);
      });
    });
  }

  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err.message === 'CORS_NOT_ALLOWED') {
      return res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN',
        message: 'Origin not allowed by security policy',
      });
    }
    next(err);
  });

  app.use(notFoundHandler);
  app.use(registerErrorHandlers);

  return app;
}
