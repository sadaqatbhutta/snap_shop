import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { recordRequest, getMetrics, resetMetrics } from '../core/metrics';
import { log, queryLogs } from '../core/logger';

describe('Metrics', () => {

  beforeEach(() => resetMetrics());

  it('counts total requests', () => {
    recordRequest('/api/emr/post', 200, 100);
    recordRequest('/api/emr/post', 200, 150);
    const m = getMetrics();
    assert.equal(m.global.total_requests, 2);
    assert.equal(m.global.total_failures, 0);
  });

  it('counts failures for 4xx and 5xx', () => {
    recordRequest('/api/emr/post', 200, 100);
    recordRequest('/api/emr/post', 500, 200);
    recordRequest('/api/emr/post', 422, 50);
    const m = getMetrics();
    assert.equal(m.global.total_failures, 2);
  });

  it('calculates correct error rate', () => {
    recordRequest('/api/health', 200, 10);
    recordRequest('/api/health', 500, 10);
    const m = getMetrics();
    assert.equal(m.global.error_rate, 0.5);
  });

  it('calculates average response time', () => {
    recordRequest('/api/health', 200, 100);
    recordRequest('/api/health', 200, 200);
    const m = getMetrics();
    assert.equal(m.global.avg_response_ms, 150);
  });

  it('tracks per-endpoint breakdown', () => {
    recordRequest('/api/emr/post', 200, 80);
    recordRequest('/api/webhook/whatsapp', 200, 120);
    recordRequest('/api/emr/post', 500, 300);
    const m = getMetrics();
    const emr = m.endpoints.find(e => e.path === '/api/emr/post')!;
    assert.equal(emr.requests, 2);
    assert.equal(emr.failures, 1);
    assert.equal(emr.error_rate, 0.5);
  });

  it('returns zero metrics when no requests recorded', () => {
    const m = getMetrics();
    assert.equal(m.global.total_requests, 0);
    assert.equal(m.global.error_rate, 0);
    assert.equal(m.global.avg_response_ms, 0);
  });

});

describe('Logger queryLogs', () => {

  it('filters by failure status', () => {
    log({ timestamp: new Date().toISOString(), level: 'error', path: '/api/emr/post', status_code: 500 });
    log({ timestamp: new Date().toISOString(), level: 'info',  path: '/api/health',   status_code: 200 });
    const results = queryLogs({ status: 'failure' });
    assert.ok(results.every(e => e.level === 'error' || (e.status_code !== undefined && e.status_code >= 400)));
  });

  it('filters by success status', () => {
    log({ timestamp: new Date().toISOString(), level: 'info', path: '/api/health', status_code: 200 });
    const results = queryLogs({ status: 'success' });
    assert.ok(results.every(e => e.level !== 'error' && (!e.status_code || e.status_code < 400)));
  });

  it('filters by endpoint path fragment', () => {
    log({ timestamp: new Date().toISOString(), level: 'info', path: '/api/emr/post',    status_code: 200 });
    log({ timestamp: new Date().toISOString(), level: 'info', path: '/api/webhook/wa',  status_code: 200 });
    const results = queryLogs({ endpoint: '/emr' });
    assert.ok(results.every(e => e.path?.includes('/emr')));
  });

  it('respects limit parameter', () => {
    for (let i = 0; i < 10; i++) {
      log({ timestamp: new Date().toISOString(), level: 'info', path: '/api/health', status_code: 200 });
    }
    const results = queryLogs({ limit: 3 });
    assert.ok(results.length <= 3);
  });

  it('filters by time range', () => {
    const past   = new Date(Date.now() - 10_000).toISOString();
    const future = new Date(Date.now() + 10_000).toISOString();
    log({ timestamp: new Date().toISOString(), level: 'info', path: '/api/health', status_code: 200 });
    const results = queryLogs({ from: past, to: future });
    assert.ok(results.length >= 1);
  });

});
