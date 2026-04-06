import { AnyZodObject, ZodTypeAny } from 'zod';
import { Request, Response, NextFunction } from 'express';

export function validateBody<T extends ZodTypeAny>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function validateParams<T extends ZodTypeAny>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = await schema.parseAsync(req.params);
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function validateQuery<T extends ZodTypeAny>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = await schema.parseAsync(req.query);
      next();
    } catch (err) {
      next(err);
    }
  };
}
