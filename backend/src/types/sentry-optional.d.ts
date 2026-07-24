declare module '@sentry/node' {
  export function init(options: Record<string, unknown>): void;
  export function captureException(err: unknown): void;
}

declare module '@sentry/react' {
  export function init(options: Record<string, unknown>): void;
}
