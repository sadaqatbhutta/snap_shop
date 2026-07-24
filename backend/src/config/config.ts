import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env.local');
dotenv.config({ path: envPath });

const ConfigSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test', 'staging']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  WEBHOOK_SECRET: z.string().min(32, 'WEBHOOK_SECRET is required and must be at least 32 characters'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),

  FIREBASE_PROJECT_ID: z.string().min(1, 'FIREBASE_PROJECT_ID is required'),
  FIREBASE_SERVICE_ACCOUNT_KEY: z.string().optional(),

  REDIS_URL: z.string().default('redis://localhost:6379'),

  WEBHOOK_VERIFY_TOKEN: z.string().min(1, 'WEBHOOK_VERIFY_TOKEN is required'),
  /** Global Meta fallbacks — prefer per-business credentials in multi-tenant production. */
  WHATSAPP_PHONE_NUMBER_ID: z.string().default(''),
  META_ACCESS_TOKEN: z.string().default(''),

  EMR_API_URL: z.string().url().default('https://emr.example.com'),
  EMR_API_KEY: z.string().optional(),
  EMR_TIMEOUT_MS: z.coerce.number().default(10000),

  QUEUE_CONCURRENCY: z.coerce.number().default(5),
  QUEUE_MAX_RETRIES: z.coerce.number().default(3),
  QUEUE_STRICT_MODE: z.coerce.boolean().default(false),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQ: z.coerce.number().default(60),
  RATE_LIMIT_AI_MAX_REQ: z.coerce.number().default(30),
  RATE_LIMIT_EMR_MAX_REQ: z.coerce.number().default(10),

  SMTP_API_URL: z.preprocess(
    v => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().url().optional()
  ),
  SMTP_API_KEY: z.string().optional(),
  SMTP_FROM_EMAIL: z.string().email().optional(),
  APP_URL: z.string().url().default('http://localhost:5173'),
  TIKTOK_WEBHOOK_SECRET: z.string().optional(),

  STRIPE_SECRET_KEY: z.preprocess(
    v => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().optional()
  ),
  STRIPE_WEBHOOK_SECRET: z.preprocess(
    v => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().optional()
  ),
  STRIPE_PRICE_GROWTH: z.string().optional(),
  STRIPE_PRICE_SCALE: z.string().optional(),

  SENTRY_DSN: z.preprocess(
    v => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().url().optional()
  ),

  /** Required in staging/production to access GET /api/logs and GET /api/metrics (via X-Observability-Key). */
  OBSERVABILITY_KEY: z.preprocess(
    v => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().min(16).optional()
  ),
});

const parsed = ConfigSchema.safeParse(process.env);
if (!parsed.success) {
  const errors = parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${errors}`);
}

export const config = parsed.data;
export type Config = typeof config;
