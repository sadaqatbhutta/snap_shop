import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import swaggerUi from 'swagger-ui-express';

import { config } from './src/config/config.js';
import { apiRouter } from './src/routes/index.js';
import { requestIdMiddleware } from './src/middlewares/requestId.js';
import { requestLogger } from './src/middlewares/requestLogger.js';
import { registerErrorHandlers, notFoundHandler } from './src/middlewares/errorHandler.js';
import { swaggerSpec } from './src/utils/swagger.js';

export async function createApp() {
  const app = express();

  app.disable('x-powered-by');

  if (config.NODE_ENV === 'production') {
    app.use(helmet());
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
