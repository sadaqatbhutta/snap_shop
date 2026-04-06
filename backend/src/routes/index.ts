import { Router } from 'express';
import { webhookRouter } from './webhook.js';
import { emrRouter } from './emr.js';
import { broadcastRouter } from './broadcast.js';
import { teamRouter } from './team.js';
import { observabilityRouter } from './observability.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';
import { config } from '../config/config.js';

export const apiRouter = Router();

apiRouter.use('/webhook', webhookRouter);
apiRouter.use('/emr', rateLimiter({ windowMs: config.RATE_LIMIT_WINDOW_MS, maxRequests: config.RATE_LIMIT_EMR_MAX_REQ, keyPrefix: 'rl_emr' }), emrRouter);
apiRouter.use('/broadcast', broadcastRouter);
apiRouter.use('/team', teamRouter);
apiRouter.use('/', observabilityRouter);
