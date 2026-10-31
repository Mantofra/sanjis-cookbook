import { RequestHandler } from 'express';
import { z } from 'zod';
import { AppError } from '../errors/app-error.js';

export function validate(schema: z.ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (result.success) {
      req.body = result.data;
      next();
    } else {
      const details = z.flattenError(result.error).fieldErrors;
      next(new AppError(400, 'Invalid request', details));
      return;
    }
  };
}
