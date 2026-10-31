import path from 'node:path';
import express from 'express';
import { config } from './config.js';

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

  if (config.isProd) {
    app.use(express.static(clientDir));
    // SPA fallback: any non-API GET gets index.html so the Angular router can handle the URL.
    app.get('/{*splat}', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(clientDir, 'index.html'));
    });
  }

  return app;
}



