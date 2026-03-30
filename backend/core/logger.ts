import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { recordRequest } from './metrics';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR   = path.resolve(__dirname, '../../logs');
const LOG_FILE  = path.join(LOG_DIR, 'app.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

// ─── In-Memory Ring Buffer (last 1000 entries for dashboard) ──────────────────
const RING_SIZE = 1000;
const ringBuffer: LogEntry[] = [];

export interface LogEntry {
  timestamp: string;
  request_id?: string;
  level: 'info' | 'warn' | 'error';
  method?: string;
  path?: string;
  status_code?: number;
  response_time_ms?: number;
  error?: string;
  [key: string]: unknown;
}

function writeToFile(entry: LogEntry) {
  try {
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
  } catch {
    // Non-blocking: never crash the app on log write failure
  }
}

export function log(data: Omit<LogEntry, 'level'> & { level?: LogEntry['level'] }) {
  const entry: LogEntry = { level: 'info', ...data } as LogEntry;

  // Write to stdout
  console.log(JSON.stringify(entry));

  // Write to file (async-safe append)
  writeToFile(entry);

  // Push to ring buffer
  if (ringBuffer.length >= RING_SIZE) ringBuffer.shift();
  ringBuffer.push(entry);
}

// ─── Query Interface for Dashboard ───────────────────────────────────────────
export interface LogQuery {
  status?: 'success' | 'failure';   // success = status_code < 400, failure = >= 400 or level=error
  endpoint?: string;
  from?: string;   // ISO timestamp
  to?: string;     // ISO timestamp
  limit?: number;
}

export function queryLogs(q: LogQuery): LogEntry[] {
  let results = [...ringBuffer];

  if (q.from)     results = results.filter(e => e.timestamp >= q.from!);
  if (q.to)       results = results.filter(e => e.timestamp <= q.to!);
  if (q.endpoint) results = results.filter(e => e.path?.includes(q.endpoint!));

  if (q.status === 'success') {
    results = results.filter(e =>
      e.level !== 'error' && (!e.status_code || e.status_code < 400)
    );
  } else if (q.status === 'failure') {
    results = results.filter(e =>
      e.level === 'error' || (e.status_code !== undefined && e.status_code >= 400)
    );
  }

  return results.slice(-(q.limit ?? 100)).reverse(); // newest first
}

// ─── Request Logger Middleware ────────────────────────────────────────────────
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = uuidv4();
  const start     = Date.now();

  (req as any).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  res.on('finish', () => {
    const responseTimeMs = Date.now() - start;
    const isError = res.statusCode >= 400;

    log({
      timestamp:        new Date().toISOString(),
      level:            isError ? 'error' : 'info',
      request_id:       requestId,
      method:           req.method,
      path:             req.path,
      status_code:      res.statusCode,
      response_time_ms: responseTimeMs,
      // Omit request_body from logs to avoid leaking sensitive data
    });

    recordRequest(req.path, res.statusCode, responseTimeMs);
  });

  next();
}
