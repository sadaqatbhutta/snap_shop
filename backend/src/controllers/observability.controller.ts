import { Request, Response, NextFunction } from 'express';
import {
  queryLogsForDashboard,
  getMetrics as getObservabilityMetrics,
  healthCheck,
  runtimeCheck,
} from '../services/observability.service.js';

export async function getLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const result = queryLogsForDashboard(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getMetrics(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(getObservabilityMetrics());
  } catch (err) {
    next(err);
  }
}

export async function getHealthStatus(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await healthCheck());
  } catch (err) {
    next(err);
  }
}

export async function getRuntimeStatus(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(runtimeCheck());
  } catch (err) {
    next(err);
  }
}
