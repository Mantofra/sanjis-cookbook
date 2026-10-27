import express from 'express';

export function createApp() {
  const app = express();
  express.json({ limit: '100kb' });
  app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });
  return app;
}
