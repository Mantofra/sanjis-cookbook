import type { ErrorRequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) return next(err);
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { message: err.message, details: err.details } });
  } else if (err.type === 'entity.parse.failed') {
    res.status(400).json({ error: { message: 'Invalid JSON' } });
  } else if (err.name === 'CastError') {
    res.status(404).json({ error: { message: 'Not found' } });
  } else if (err.code === 11000) {
    res.status(409).json({ error: { message: 'Already exists' } });
  } else {
    console.error(err);
    res.status(500).json({ error: { message: 'Something went wrong' } });
  }
};
