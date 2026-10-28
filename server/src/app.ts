import express from 'express';

export function createApp() {
  const app = express();
  app.use(express.json({ limit: '100kb' }));
  app.get('/api/health', (_req, res) => {
    res.status(200).json({ ok: true });
  });
  return app;
}
