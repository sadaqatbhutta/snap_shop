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
  GEMINI_API_KEY:               z.string().min(1, 'GEMINI_API_KEY is required'),
  
  // Security
  WEBHOOK_SECRET:               z.string().min(32, 'WEBHOOK_SECRET is required and must be at least 32 characters'),
  ALLOWED_ORIGINS:              z.string().default('http://localhost:5173'),
  
  // Firebase Frontend Config (Validated at startup)
  VITE_FIREBASE_API_KEY:        z.string().min(1, 'VITE_FIREBASE_API_KEY is required'),
  VITE_FIREBASE_AUTH_DOMAIN:    z.string().min(1, 'VITE_FIREBASE_AUTH_DOMAIN is required'),
  VITE_FIREBASE_PROJECT_ID:     z.string().min(1, 'VITE_FIREBASE_PROJECT_ID is required'),
  VITE_FIREBASE_STORAGE_BUCKET: z.string().min(1, 'VITE_FIREBASE_STORAGE_BUCKET is required'),
  VITE_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1, 'VITE_FIREBASE_MESSAGING_SENDER_ID is required'),
  VITE_FIREBASE_APP_ID:         z.string().min(1, 'VITE_FIREBASE_APP_ID is required'),
  VITE_FIREBASE_FIRESTORE_DATABASE_ID: z.string().optional(),

  // Redis
  REDIS_URL:         z.string().default('redis://localhost:6379'),

  // Meta Integration
  WEBHOOK_VERIFY_TOKEN:         z.string().min(1, 'WEBHOOK_VERIFY_TOKEN is required'),
  WHATSAPP_PHONE_NUMBER_ID:     z.string().min(1, 'WHATSAPP_PHONE_NUMBER_ID is required'),
  META_ACCESS_TOKEN:            z.string().min(1, 'META_ACCESS_TOKEN is required'),

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

  // Team Invite / Mail
  SMTP_API_URL:           z.string().default('https://api.sendgrid.com/v3/mail/send'), // Placeholder
  APP_URL:                z.string().default('http://localhost:5173'),
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
