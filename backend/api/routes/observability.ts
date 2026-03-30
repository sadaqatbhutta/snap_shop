import { Router } from 'express';
import { queryLogs, LogQuery } from '../../core/logger';
import { getMetrics } from '../../core/metrics';
import { emrQueue, webhookQueue } from '../../core/queue';

export const observabilityRouter = Router();

/**
 * GET /api/logs
 *
 * Query recent structured logs from the in-memory ring buffer.
 *
 * Query params:
 *   status   — "success" | "failure"
 *   endpoint — path fragment to filter on (e.g. "/emr")
 *   from     — ISO timestamp lower bound
 *   to       — ISO timestamp upper bound
 *   limit    — max entries to return (default 100, max 1000)
 *
 * Example:
 *   GET /api/logs?status=failure&endpoint=/emr&limit=50
 */
observabilityRouter.get('/logs', (req, res) => {
  const query: LogQuery = {
    status:   req.query.status   as LogQuery['status'],
    endpoint: req.query.endpoint as string | undefined,
    from:     req.query.from     as string | undefined,
    to:       req.query.to       as string | undefined,
    limit:    req.query.limit    ? Math.min(Number(req.query.limit), 1000) : 100,
  };

  const entries = queryLogs(query);
  res.json({ count: entries.length, logs: entries });
});

/**
 * GET /api/metrics
 *
 * Returns in-process counters:
 *   - total_requests, total_failures, error_rate, avg_response_ms (global)
 *   - per-endpoint breakdown
 *
 * Example response:
 * {
 *   "global": { "total_requests": 120, "total_failures": 3, "error_rate": 0.025, "avg_response_ms": 87.4 },
 *   "endpoints": [{ "path": "/api/emr/post", "requests": 80, ... }]
 * }
 */
observabilityRouter.get('/metrics', (_req, res) => {
  res.json(getMetrics());
});

/**
 * GET /api/health
 *
 * Enhanced health check — includes queue depths and uptime.
 */
observabilityRouter.get('/health', async (_req, res) => {
  try {
    const [emrWaiting, webhookWaiting] = await Promise.all([
      emrQueue.getWaitingCount(),
      webhookQueue.getWaitingCount(),
    ]);

    res.json({
      status:    'ok',
      timestamp: new Date().toISOString(),
      uptime_s:  Math.floor(process.uptime()),
      queues: {
        emr:     { waiting: emrWaiting },
        webhook: { waiting: webhookWaiting },
      },
    });
  } catch {
    // Redis may not be available in all environments
    res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime_s: Math.floor(process.uptime()) });
  }
});
