// ─── In-Process Metrics ───────────────────────────────────────────────────────
// Lightweight counters — no external dependency required.
// For production at scale, export these to Prometheus/CloudWatch.

interface EndpointMetric {
  requests: number;
  failures: number;
  totalResponseMs: number;
}

const store: Record<string, EndpointMetric> = {};
let globalRequests  = 0;
let globalFailures  = 0;
let globalResponseMs = 0;

export function recordRequest(path: string, statusCode: number, responseMs: number) {
  globalRequests++;
  globalResponseMs += responseMs;
  if (statusCode >= 400) globalFailures++;

  if (!store[path]) store[path] = { requests: 0, failures: 0, totalResponseMs: 0 };
  store[path].requests++;
  store[path].totalResponseMs += responseMs;
  if (statusCode >= 400) store[path].failures++;
}

export function getMetrics() {
  const endpoints = Object.entries(store).map(([path, m]) => ({
    path,
    requests:          m.requests,
    failures:          m.failures,
    error_rate:        m.requests ? +(m.failures / m.requests).toFixed(3) : 0,
    avg_response_ms:   m.requests ? +(m.totalResponseMs / m.requests).toFixed(1) : 0,
  }));

  return {
    global: {
      total_requests:   globalRequests,
      total_failures:   globalFailures,
      error_rate:       globalRequests ? +(globalFailures / globalRequests).toFixed(3) : 0,
      avg_response_ms:  globalRequests ? +(globalResponseMs / globalRequests).toFixed(1) : 0,
    },
    endpoints,
    captured_at: new Date().toISOString(),
  };
}

export function resetMetrics() {
  Object.keys(store).forEach(k => delete store[k]);
  globalRequests = globalFailures = globalResponseMs = 0;
}
