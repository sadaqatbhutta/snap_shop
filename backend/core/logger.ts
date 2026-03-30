import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

function log(data: Record<string, unknown>) {
  console.log(JSON.stringify(data));
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = uuidv4();
  const start = Date.now();

  (req as any).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  res.on('finish', () => {
    log({
      timestamp: new Date().toISOString(),
      request_id: requestId,
      method: req.method,
      path: req.path,
      request_body: req.body,
      status_code: res.statusCode,
      response_time_ms: Date.now() - start,
    });
  });

  next();
}

export { log };
