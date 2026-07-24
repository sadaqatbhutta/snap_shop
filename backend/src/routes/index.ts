import { Router } from 'express';
import { webhookRouter } from './webhook.js';
import { broadcastRouter } from './broadcast.js';
import { teamRouter } from './team.js';
import { observabilityRouter } from './observability.js';
import { conversationsRouter } from './conversations.js';
import { aiRouter } from './ai.js';
import { webchatRouter } from './webchat.js';
import { businessRouter } from './business.js';
import { billingRouter } from './billing.js';
import { adminRouter } from './admin.js';
import { oauthRouter } from './oauth.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';
import { config } from '../config/config.js';

export const apiRouter = Router();

apiRouter.use('/webhook', rateLimiter({ windowMs: config.RATE_LIMIT_WINDOW_MS, maxRequests: config.RATE_LIMIT_MAX_REQ, keyPrefix: 'rl_webhook' }), webhookRouter);
apiRouter.use('/broadcast', rateLimiter({ windowMs: config.RATE_LIMIT_WINDOW_MS, maxRequests: config.RATE_LIMIT_MAX_REQ, keyPrefix: 'rl_broadcast' }), broadcastRouter);
apiRouter.use('/team', rateLimiter({ windowMs: config.RATE_LIMIT_WINDOW_MS, maxRequests: config.RATE_LIMIT_MAX_REQ, keyPrefix: 'rl_team' }), teamRouter);
apiRouter.use('/conversations', rateLimiter({ windowMs: config.RATE_LIMIT_WINDOW_MS, maxRequests: config.RATE_LIMIT_MAX_REQ, keyPrefix: 'rl_conversations' }), conversationsRouter);
apiRouter.use('/ai', rateLimiter({ windowMs: config.RATE_LIMIT_WINDOW_MS, maxRequests: config.RATE_LIMIT_AI_MAX_REQ, keyPrefix: 'rl_ai' }), aiRouter);
apiRouter.use('/webchat', rateLimiter({ windowMs: config.RATE_LIMIT_WINDOW_MS, maxRequests: config.RATE_LIMIT_MAX_REQ, keyPrefix: 'rl_webchat' }), webchatRouter);
apiRouter.use('/business', rateLimiter({ windowMs: config.RATE_LIMIT_WINDOW_MS, maxRequests: config.RATE_LIMIT_MAX_REQ, keyPrefix: 'rl_business' }), businessRouter);
apiRouter.use('/billing', rateLimiter({ windowMs: config.RATE_LIMIT_WINDOW_MS, maxRequests: config.RATE_LIMIT_MAX_REQ, keyPrefix: 'rl_billing' }), billingRouter);
apiRouter.use('/admin', rateLimiter({ windowMs: config.RATE_LIMIT_WINDOW_MS, maxRequests: config.RATE_LIMIT_MAX_REQ, keyPrefix: 'rl_admin' }), adminRouter);
apiRouter.use('/oauth', rateLimiter({ windowMs: config.RATE_LIMIT_WINDOW_MS, maxRequests: config.RATE_LIMIT_MAX_REQ, keyPrefix: 'rl_oauth' }), oauthRouter);
apiRouter.use('/', observabilityRouter);
