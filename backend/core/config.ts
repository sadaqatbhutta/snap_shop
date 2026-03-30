import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const ConfigSchema = z.object({
  // Server
  PORT:              z.coerce.number().default(3000),
  NODE_ENV:          z.enum(['development', 'production', 'test']).default('development'),

  // Firebase / Gemini
  GEMINI_API_KEY:    z.string().min(1, 'GEMINI_API_KEY is required'),

  // Redis
  REDIS_URL:         z.string().default('redis://localhost:6379'),

  // EMR
  EMR_API_URL:       z.string().default('https://emr.example.com'),
  EMR_API_KEY:       z.string().default(''),
  EMR_TIMEOUT_MS:    z.coerce.number().default(10_000),

  // Queue
  QUEUE_CONCURRENCY: z.coerce.number().default(5),
  QUEUE_MAX_RETRIES: z.coerce.number().default(3),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS:   z.coerce.number().default(60_000),  // 1 minute window
  RATE_LIMIT_MAX_REQ:     z.coerce.number().default(60),      // 60 req/min per IP
  RATE_LIMIT_EMR_MAX_REQ: z.coerce.number().default(10),      // stricter for EMR
});

function loadConfig() {
  const result = ConfigSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${missing}`);
  }
  return result.data;
}

export const config = loadConfig();
export type Config = typeof config;
