import { describe, expect, it, vi, beforeAll } from 'vitest';
import request from 'supertest';

vi.mock('../src/config/firebase.js', () => ({
  auth: {
    verifyIdToken: vi.fn(async (token: string) => {
      if (token === 'valid-token') {
        return { uid: 'user-1', email: 'test@example.com', name: 'Test User' };
      }
      throw new Error('Invalid token');
    }),
  },
}));

import { createApp } from '../app.js';

let app: any;

beforeAll(async () => {
  app = await createApp();
});

describe('Auth middleware', () => {
  it('rejects requests without authorization header', async () => {
    const res = await request(app).post('/api/emr/post').send({ path: '/test', payload: {} });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('accepts valid Firebase token', async () => {
    const res = await request(app)
      .post('/api/emr/post')
      .set('Authorization', 'Bearer valid-token')
      .send({ path: '/patients', payload: { name: 'John' } });

    expect(res.status).toBe(202);
    expect(res.body.status).toBe('queued');
  });
});
