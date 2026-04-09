import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';

process.env.NODE_ENV = 'test';
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-key';
process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'test-project';
process.env.WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'a'.repeat(32);
process.env.WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'verify-token';
process.env.META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || 'meta-token';
process.env.WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '123';

import { createApp } from '../app.js';

let app: any;

beforeAll(async () => {
  app = await createApp();
});

describe('Backend API', () => {
  it('returns health status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('queues webhook messages with valid payload', async () => {
    const payload = {
      business_id: 'biz-1',
      user_id: 'user-1',
      message: 'Hello',
    };
    const signature = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET!).update(JSON.stringify(payload)).digest('hex');
    const res = await request(app).post('/api/webhook/whatsapp').send(payload).set('x-snap-signature', signature);

    expect(res.status).toBe(202);
    expect(res.body).toHaveProperty('status', 'queued');
    expect(res.body).toHaveProperty('job_id');
  });

  it('returns 401 for missing webhook signature', async () => {
    const res = await request(app).post('/api/webhook/whatsapp').send({
      user_id: 'user-1',
      message: 'Hello',
    });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_SIGNATURE');
  });
});
