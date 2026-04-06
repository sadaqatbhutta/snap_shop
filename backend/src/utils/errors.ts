export class AppError extends Error {
  constructor(public code: string, public message: string, public statusCode = 400) {
    super(message);
    this.name = 'AppError';
  }
}

export function buildError(code: string, message: string, statusCode = 400) {
  return new AppError(code, message, statusCode);
}
