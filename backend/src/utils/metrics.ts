interface EndpointMetric {
  requests: number;
  failures: number;
  totalResponseMs: number;
}

const store: Record<string, EndpointMetric> = {};
let globalRequests = 0;
let globalFailures = 0;
let globalResponseMs = 0;

export function recordRequest(path: string, statusCode: number, responseMs: number) {
  globalRequests++;
  globalResponseMs += responseMs;
  if (statusCode >= 400) globalFailures++;

  const endpoint = path.split('?')[0];
  if (!store[endpoint]) {
    store[endpoint] = { requests: 0, failures: 0, totalResponseMs: 0 };
  }

  store[endpoint].requests++;
  store[endpoint].totalResponseMs += responseMs;
  if (statusCode >= 400) store[endpoint].failures++;
}

export function getMetrics() {
  const endpoints = Object.entries(store).map(([path, metric]) => ({
    path,
    requests: metric.requests,
    failures: metric.failures,
    error_rate: metric.requests ? +(metric.failures / metric.requests).toFixed(3) : 0,
    avg_response_ms: metric.requests ? +(metric.totalResponseMs / metric.requests).toFixed(1) : 0,
  }));

  return {
    global: {
      total_requests: globalRequests,
      total_failures: globalFailures,
      error_rate: globalRequests ? +(globalFailures / globalRequests).toFixed(3) : 0,
      avg_response_ms: globalRequests ? +(globalResponseMs / globalRequests).toFixed(1) : 0,
    },
    endpoints,
    captured_at: new Date().toISOString(),
  };
}

export function resetMetrics() {
  Object.keys(store).forEach(key => delete store[key]);
  globalRequests = 0;
  globalFailures = 0;
  globalResponseMs = 0;
}
