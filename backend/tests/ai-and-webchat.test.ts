import { beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../src/services/ai.service.js', () => ({
  processAIMessage: vi.fn(async () => ({
    intent: 'inquiry',
    language: 'en',
    confidence: 0.92,
    reply: 'Sure, here is the answer.',
    shouldEscalate: false,
  })),
}));

vi.mock('../src/services/webhook.service.js', () => ({
  enqueueWebhookMessage: vi.fn(async () => ({ id: 'job-1' })),
  getWebhookJobStatusById: vi.fn(async () => ({ id: 'job-1', state: 'completed' })),
  processWebhookJob: vi.fn(async () => ({
    status: 'processed',
    id: 'msg-1',
    conversationId: 'conv-1',
    reply: 'Hello from AI',
    intent: 'greeting',
    confidence: 0.8,
  })),
}));

vi.mock('../src/config/firebase.js', () => ({
  db: {
    doc: () => ({ get: async () => ({ exists: true, data: () => ({ ownerEmail: 'test@example.com' }) }) }),
    collection: () => ({ doc: () => ({ get: async () => ({ exists: true }), set: async () => ({}), update: async () => ({}) }) }),
  },
  auth: {
    verifyIdToken: async () => ({ uid: 'test-uid', email: 'test@example.com' }),
  },
}));

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

describe('AI and Webchat endpoints', () => {
  it('processes AI request via /api/ai/process', async () => {
    const res = await request(app)
      .post('/api/ai/process')
      .set('Authorization', 'Bearer test-token')
      .send({
        message: 'What are your hours?',
        conversationId: 'conv-1',
        businessId: 'biz-1',
      });

    expect(res.status).toBe(200);
    expect(res.body.intent).toBe('inquiry');
    expect(res.body.reply).toBeTruthy();
  });

  it('accepts webchat message via /api/webchat/message', async () => {
    const res = await request(app).post('/api/webchat/message').send({
      business_id: 'biz-1',
      user_id: 'visitor-1',
      message: 'Hello there',
      type: 'text',
      name: 'Visitor',
    });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('processed');
    expect(res.body.reply).toBeTruthy();
  });
});
