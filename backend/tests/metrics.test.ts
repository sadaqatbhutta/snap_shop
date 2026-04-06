import { beforeEach, describe, expect, it } from 'vitest';
import { recordRequest, getMetrics, resetMetrics } from '../src/utils/metrics.js';
import { pushLog, queryLogs } from '../src/utils/logStore.js';

describe('Metrics', () => {
  beforeEach(() => resetMetrics());

  it('counts total requests', () => {
    recordRequest('/api/emr/post', 200, 100);
    recordRequest('/api/emr/post', 200, 150);
    const m = getMetrics();
    expect(m.global.total_requests).toBe(2);
    expect(m.global.total_failures).toBe(0);
  });

  it('counts failures for 4xx and 5xx', () => {
    recordRequest('/api/emr/post', 200, 100);
    recordRequest('/api/emr/post', 500, 200);
    recordRequest('/api/emr/post', 422, 50);
    const m = getMetrics();
    expect(m.global.total_failures).toBe(2);
  });

  it('calculates correct error rate', () => {
    recordRequest('/api/health', 200, 10);
    recordRequest('/api/health', 500, 10);
    const m = getMetrics();
    expect(m.global.error_rate).toBe(0.5);
  });

  it('calculates average response time', () => {
    recordRequest('/api/health', 200, 100);
    recordRequest('/api/health', 200, 200);
    const m = getMetrics();
    expect(m.global.avg_response_ms).toBe(150);
  });

  it('tracks per-endpoint breakdown', () => {
    recordRequest('/api/emr/post', 200, 80);
    recordRequest('/api/webhook/whatsapp', 200, 120);
    recordRequest('/api/emr/post', 500, 300);
    const m = getMetrics();
    const emr = m.endpoints.find(e => e.path === '/api/emr/post');
    expect(emr).toBeDefined();
    expect(emr?.requests).toBe(2);
    expect(emr?.failures).toBe(1);
    expect(emr?.error_rate).toBe(0.5);
  });

  it('returns zero metrics when no requests recorded', () => {
    const m = getMetrics();
    expect(m.global.total_requests).toBe(0);
    expect(m.global.error_rate).toBe(0);
    expect(m.global.avg_response_ms).toBe(0);
  });
});

describe('Logger queryLogs', () => {
  it('filters by failure status', () => {
    pushLog({ timestamp: new Date().toISOString(), level: 'error', path: '/api/emr/post', status_code: 500 });
    pushLog({ timestamp: new Date().toISOString(), level: 'info', path: '/api/health', status_code: 200 });
    const results = queryLogs({ status: 'failure' });
    expect(results.every(e => e.level === 'error' || (e.status_code !== undefined && e.status_code >= 400))).toBe(true);
  });

  it('filters by success status', () => {
    pushLog({ timestamp: new Date().toISOString(), level: 'info', path: '/api/health', status_code: 200 });
    const results = queryLogs({ status: 'success' });
    expect(results.every(e => e.level !== 'error' && (!e.status_code || e.status_code < 400))).toBe(true);
  });

  it('filters by endpoint path fragment', () => {
    pushLog({ timestamp: new Date().toISOString(), level: 'info', path: '/api/emr/post', status_code: 200 });
    pushLog({ timestamp: new Date().toISOString(), level: 'info', path: '/api/webhook/wa', status_code: 200 });
    const results = queryLogs({ endpoint: '/emr' });
    expect(results.every(e => e.path?.includes('/emr'))).toBe(true);
  });

  it('respects limit parameter', () => {
    for (let i = 0; i < 10; i++) {
      pushLog({ timestamp: new Date().toISOString(), level: 'info', path: '/api/health', status_code: 200 });
    }
    const results = queryLogs({ limit: 3 });
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('filters by time range', () => {
    const past = new Date(Date.now() - 10_000).toISOString();
    const future = new Date(Date.now() + 10_000).toISOString();
    pushLog({ timestamp: new Date().toISOString(), level: 'info', path: '/api/health', status_code: 200 });
    const results = queryLogs({ from: past, to: future });
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});
