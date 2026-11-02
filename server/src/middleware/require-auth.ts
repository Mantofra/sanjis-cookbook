import jwt from 'jsonwebtoken';
import { Request, RequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';
import { config } from '../config.js';

export const requireAuth: RequestHandler = (req: Request, res, next) => {
  const token = req.cookies.token;
  if (!token) throw new AppError(401, 'Not authenticated');

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    if (typeof payload === 'string' || !payload.sub) {
      throw new Error('Bad payload');
    }
    req.userId = payload.sub;
    next();
  } catch {
    throw new AppError(401, 'Not authenticated');
  }
};
