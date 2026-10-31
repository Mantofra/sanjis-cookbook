import express from 'express';
import path from 'node:path';
import { config } from './config.js';
import { errorHandler } from './middleware/error-handler.js';
import { AppError } from './errors/app-error.js';

// Angular build output. Works from both server/src and server/dist (each is one level inside server/).
const clientDir = path.resolve(
  import.meta.dirname,
  '..',
  '..',
  'client',
  'dist',
  'client',
  'browser',
);

export function createApp() {
  const app = express();

  if (config.isProd) {
    // Render's proxy terminates HTTPS; trust it so req.ip and req.secure reflect the real client.
    app.set('trust proxy', 1);
  }

  app.use(express.json({ limit: '100kb' }));
  app.get('/api/health', (_req, res) => {
    res.status(200).json({ ok: true });
  });
  app.use('/api', (_req, _res, next) => {
    next(new AppError(404, 'Not found'));
  });

  if (config.isProd) {
    app.use(express.static(clientDir));
    // SPA fallback: any non-API GET gets index.html so the Angular router can handle the URL.
    app.get('/{*splat}', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(clientDir, 'index.html'));
    });
  }

  app.use(errorHandler);

  return app;
}
