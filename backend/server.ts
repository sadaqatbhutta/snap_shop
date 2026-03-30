/**
 * SnapShop Backend Server
 * ─────────────────────────────────────────────
 * Responsibilities:
 *  1. Mount middleware (logging, body parsing, CORS)
 *  2. Mount API routes (webhook, EMR, health)
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

import { config } from './core/config';
import { requestLogger } from './core/logger';
import { registerErrorHandlers } from './core/exceptions';
import { webhookRouter } from './api/routes/webhook';
import { emrRouter } from './api/routes/emr';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── Firebase Admin Init ──────────────────────────────────────────────────────
if (!getApps().length) initializeApp();

// ─── Express App ──────────────────────────────────────────────────────────────
async function startServer() {
  const app = express();

  // ── Global Middleware ──────────────────────────────────────────────────────
  app.use(cors());
  app.use(bodyParser.json());
  app.use(requestLogger);

  // ── API Routes ─────────────────────────────────────────────────────────────
  app.use('/api/webhook', webhookRouter);
  app.use('/api/emr',     emrRouter);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── Global Error Handlers (must be after all routes) ──────────────────────
  registerErrorHandlers(app);

  // ── Vite Dev / Static Production ──────────────────────────────────────────
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
    console.log(`   Workers: run 'npm run worker' to start background job processing\n`);
  });
}

startServer();
