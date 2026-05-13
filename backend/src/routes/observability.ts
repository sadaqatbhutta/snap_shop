import { Router } from 'express';
import { getMetrics, getLogs, getHealthStatus, getRuntimeStatus } from '../controllers/observability.controller.js';
import { requireObservabilityKey } from '../middlewares/observabilityAuth.js';

export const observabilityRouter = Router();

observabilityRouter.get('/logs', requireObservabilityKey, getLogs);
observabilityRouter.get('/metrics', requireObservabilityKey, getMetrics);
observabilityRouter.get('/health', getHealthStatus);
observabilityRouter.get('/runtime', getRuntimeStatus);
