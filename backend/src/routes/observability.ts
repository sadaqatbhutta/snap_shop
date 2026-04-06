import { Router } from 'express';
import { getMetrics, getLogs, getHealthStatus } from '../controllers/observability.controller.js';

export const observabilityRouter = Router();

observabilityRouter.get('/logs', getLogs);
observabilityRouter.get('/metrics', getMetrics);
observabilityRouter.get('/health', getHealthStatus);
