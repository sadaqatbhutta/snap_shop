import http from 'http';
import { AddressInfo } from 'net';
import { Application } from 'express';

// ─── Minimal HTTP test client (no supertest dependency) ───────────────────────
export interface TestResponse {
  status: number;
  body: any;
  headers: http.IncomingHttpHeaders;
}

export class TestClient {
  private baseUrl: string;
  private server: http.Server;

  constructor(app: Application) {
    this.server  = http.createServer(app);
    this.baseUrl = '';
  }

  async start(): Promise<void> {
    return new Promise(resolve => {
      this.server.listen(0, '127.0.0.1', () => {
        const { port } = this.server.address() as AddressInfo;
        this.baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) =>
      this.server.close(err => (err ? reject(err) : resolve()))
    );
  }

  async request(method: string, path: string, body?: unknown): Promise<TestResponse> {
    return new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : undefined;
      const req = http.request(`${this.baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
      }, res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode!, body: JSON.parse(data), headers: res.headers });
          } catch {
            resolve({ status: res.statusCode!, body: data, headers: res.headers });
          }
        });
      });
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  post(path: string, body: unknown) { return this.request('POST', path, body); }
  get(path: string)                 { return this.request('GET',  path); }
}

// ─── Mock fetch factory ───────────────────────────────────────────────────────
export type MockFetchBehavior =
  | { type: 'success'; body: unknown; status?: number }
  | { type: 'http_error'; status: number }
  | { type: 'network_error'; message: string }
  | { type: 'sequence'; responses: MockFetchBehavior[] };

export function createMockFetch(behavior: MockFetchBehavior) {
  let callCount = 0;

  const mockFetch = async (_url: string, _opts?: RequestInit): Promise<Response> => {
    const current = callCount++;

    let b = behavior;
    if (b.type === 'sequence') {
      b = b.responses[Math.min(current, b.responses.length - 1)];
    }

    if (b.type === 'network_error') throw new Error(b.message);

    const status = b.type === 'http_error' ? b.status : ('status' in b ? b.status : undefined) ?? 200;
    const responseBody = b.type === 'success' ? b.body : { error: 'EMR error' };

    return {
      ok:     status < 400,
      status,
      json:   async () => responseBody,
      text:   async () => JSON.stringify(responseBody),
    } as Response;
  };

  return { mockFetch, getCallCount: () => callCount };
}

// ─── Valid webhook payload ────────────────────────────────────────────────────
export const validWebhookPayload = {
  business_id: 'biz-test-001',
  user_id:     '+923001234567',
  message:     'What is the price?',
  type:        'text',
  name:        'Test User',
};
