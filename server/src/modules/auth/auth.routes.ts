import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AppError } from '../../errors/app-error.js';
import { requireAuth } from '../../middleware/require-auth.js';
import { validate } from '../../middleware/validate.js';
import { login, logout, me, register } from './auth.controller.js';
import { loginSchema, registerSchema } from './auth.schemas.js';

export function createAuthRouter(): Router {
  const router = Router();
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new AppError(429, 'Too many attempts, try again later')),
  });

  router.get('/me', requireAuth, me);

  router.post('/register', limiter, validate(registerSchema), register);
  router.post('/login', limiter, validate(loginSchema), login);
  router.post('/logout', requireAuth, logout);

  return router;
}
