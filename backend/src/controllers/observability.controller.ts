import { Request, Response, NextFunction } from 'express';
import { queryLogsForDashboard, getMetrics, healthCheck } from '../services/observability.service.js';

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
    res.json(getMetrics());
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
