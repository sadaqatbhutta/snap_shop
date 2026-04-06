import pino from 'pino';
import { config } from '../config/config.js';

export const logger = pino({
  level: config.LOG_LEVEL,
  base: { service: 'snapshop-backend' },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport:
    config.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
        }
      : undefined,
});

export function buildLogEntry(overrides: Record<string, unknown> = {}) {
  return { ...overrides, timestamp: new Date().toISOString() };
}
