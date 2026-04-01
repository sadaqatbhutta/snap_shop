/**
 * SnapShop Backend Server
 * ─────────────────────────────────────────────
 * Responsibilities:
 *  1. Mount middleware (logging, body parsing, CORS, rate limiting)
 *  2. Mount API routes (webhook, EMR, observability)
 *  3. Register global error handlers
 *  4. Serve Vite dev middleware / static production build
 *
 * All business logic lives in backend/services/
 * All queue logic lives in backend/core/queue.ts
 * Worker runs separately: npm run worker
 */

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, getApps } from 'firebase-admin/app';

import helmet from 'helmet';
import { config } from './core/config';
import { requestLogger } from './core/logger';
import { registerErrorHandlers } from './core/exceptions';
import { rateLimiter } from './core/rateLimit';
import { webhookRouter } from './api/routes/webhook';
import { emrRouter } from './api/routes/emr';
import { teamRouter } from './api/routes/team';
import { broadcastRouter } from './api/routes/broadcast';
import { observabilityRouter } from './api/routes/observability';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── Firebase Admin Init ──────────────────────────────────────────────────────
if (!getApps().length) initializeApp();

// ─── Express App ──────────────────────────────────────────────────────────────
export async function createApp() {
  const app = express();

  // ── Global Middleware ──────────────────────────────────────────────────────
  app.use(helmet());                    // Security headers (HSTS, X-Frame-Options, etc.)
  app.disable('x-powered-by');          // Hide Express fingerprint
  app.use(cors());
  app.use(bodyParser.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    }
  }));
  app.use(requestLogger);

  // ── Global Rate Limit (all /api routes) ───────────────────────────────────
  app.use('/api', rateLimiter({
    windowMs:    config.RATE_LIMIT_WINDOW_MS,
    maxRequests: config.RATE_LIMIT_MAX_REQ,
  }));

  // ── Stricter Rate Limit for EMR (external API protection) ─────────────────
  app.use('/api/emr', rateLimiter({
    windowMs:    config.RATE_LIMIT_WINDOW_MS,
    maxRequests: config.RATE_LIMIT_EMR_MAX_REQ,
  }));

  // ── API Routes ─────────────────────────────────────────────────────────────
  app.use('/api/webhook', webhookRouter);
  app.use('/api/emr',     emrRouter);
  app.use('/api/team',    teamRouter);
  app.use('/api/broadcast', broadcastRouter);
  app.use('/api',         observabilityRouter);  // /api/logs, /api/metrics, /api/health

  // ── Global Error Handlers (must be after all routes) ──────────────────────
  registerErrorHandlers(app);

  return app;
}

// ─── Start (only when run directly, not during tests) ─────────────────────────
async function startServer() {
  const app = await createApp();

  if (config.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      root: path.resolve(__dirname, '../frontend'),
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, '../frontend/dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(config.PORT, '0.0.0.0', () => {
    console.log(`\n🚀 SnapShop running at http://localhost:${config.PORT}\n`);
    console.log(`   Workers : run 'npm run worker' to start background job processing`);
    console.log(`   Logs    : GET /api/logs?status=failure&limit=50`);
    console.log(`   Metrics : GET /api/metrics`);
    console.log(`   Health  : GET /api/health\n`);
  });
}

startServer();
