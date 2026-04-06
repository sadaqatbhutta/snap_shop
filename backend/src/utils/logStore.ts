export interface LogEntry {
  timestamp: string;
  request_id?: string;
  level: 'info' | 'warn' | 'error';
  method?: string;
  path?: string;
  status_code?: number;
  response_time_ms?: number;
  error?: string;
  [key: string]: unknown;
}

const RING_SIZE = 1000;
const ringBuffer: LogEntry[] = [];

export function pushLog(entry: LogEntry) {
  if (ringBuffer.length >= RING_SIZE) {
    ringBuffer.shift();
  }
  ringBuffer.push(entry);
}

export interface LogQuery {
  status?: 'success' | 'failure';
  endpoint?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export function queryLogs(query: LogQuery) {
  let results = [...ringBuffer];

  if (query.from) {
    results = results.filter(entry => entry.timestamp >= query.from!);
  }
  if (query.to) {
    results = results.filter(entry => entry.timestamp <= query.to!);
  }
  if (query.endpoint) {
    results = results.filter(entry => entry.path?.includes(query.endpoint!));
  }
  if (query.status === 'success') {
    results = results.filter(entry => entry.level !== 'error' && (!entry.status_code || entry.status_code < 400));
  }
  if (query.status === 'failure') {
    results = results.filter(entry => entry.level === 'error' || (entry.status_code ?? 0) >= 400);
  }

  return results.slice(-Math.min(query.limit ?? 100, 1000)).reverse();
}
