import { beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';

vi.mock('../src/config/firebase.js', () => ({
  db: {
    collection: () => ({
      doc: () => ({
        get: async () => ({ exists: false }),
        set: async () => ({}),
        update: async () => ({}),
      }),
    }),
  },
  auth: {
    verifyIdToken: async () => ({ uid: 'test-uid', email: 'test@example.com' }),
  },
}));

import { createApp } from '../app.js';

let app: any;

beforeAll(async () => {
  app = await createApp();
});

describe('API Routes', () => {
  it('returns health status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeTruthy();
    expect(res.body.integrations?.billing).toMatchObject({ configured: expect.any(Boolean) });
    expect(res.body.integrations?.email).toMatchObject({ configured: expect.any(Boolean) });
    expect(res.body.integrations?.metaOAuth).toMatchObject({ configured: expect.any(Boolean) });
  });

  it('queues webhook requests and returns 202', async () => {
    const payload = {
      business_id: 'biz-1',
      user_id: 'user-1',
      message: 'Hello',
    };
    const signature = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET!).update(JSON.stringify(payload)).digest('hex');
    const res = await request(app).post('/api/webhook/whatsapp').send({
      ...payload,
    }).set('x-snap-signature', signature);

    expect(res.status).toBe(202);
    expect(res.body.status).toBe('queued');
    expect(res.body.job_id).toBeTruthy();
  });

  it('returns unsupported channel error for invalid channel', async () => {
    const payload = { message: 'hello' };
    const signature = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET!).update(JSON.stringify(payload)).digest('hex');
    const res = await request(app).post('/api/webhook/unknown').send(payload).set('x-snap-signature', signature);

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('UNSUPPORTED_CHANNEL');
  });

  it('returns signature error when webhook signature missing', async () => {
    const res = await request(app).post('/api/webhook/whatsapp').send({
      user_id: 'user-1',
      message: 'Hello',
    });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_SIGNATURE');
  });
});
