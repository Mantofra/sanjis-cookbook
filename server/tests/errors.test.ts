import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import express from 'express';
import { AppError } from '../src/errors/app-error.js';
import { validate } from '../src/middleware/validate.js';
import { z } from 'zod';
import { errorHandler } from '../src/middleware/error-handler.js';

describe('GET /api/does-not-exist', () => {
  it('returns 404 with {message: Not found}', async () => {
    const res = await request(createApp()).get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.error.message).toEqual('Not found');
  });
});

describe('POST /api/health', () => {
  it('returns 400 when the JSON is malformed', async () => {
    const res = await request(createApp())
      .post('/api/health')
      .set({ 'content-type': 'application/json' })
      .send('bad json');

    expect(res.status).toBe(400);
    expect(typeof res.body.error.message).equals('string');
  });
});

describe('POST /api/health', () => {
  it('returns 400 when the JSON is malformed', async () => {
    const res = await request(createApp())
      .post('/api/health')
      .set({ 'content-type': 'application/json' })
      .send('bad json');

    expect(res.type).equals('application/json');
    expect(res.text).not.toContain('stack');
  });
});

const app = express();
app.use(express.json());
app.get('/app-error', () => {
  throw new AppError(418, 'teapot');
});
app.get('/crash', () => {
  throw new Error('secret');
});
app.post('/echo', validate(z.object({ name: z.string().trim() })), (req, res) => {
  res.json(req.body);
});
app.use(errorHandler);

describe('GET /app-error', () => {
  it('', async () => {
    const res = await request(app).get('/app-error');

    expect(res.status).toBe(418);
    expect(res.body.error.message).equals('teapot');
  });
});

describe('GET /crash', () => {
  it('', async () => {
    const res = await request(app).get('/crash');

    expect(res.status).toBe(500);
    expect(res.body.error.message).equals('Something went wrong');
    expect(res.text).not.toContain('secret');
  });
});

describe('POST /echo', () => {
  it('', async () => {
    const res = await request(app)
      .post('/echo')
      .set({ 'content-type': 'application/json' })
      .send({ name: '  Sanji  ' });

    expect(res.status).toBe(200);
    expect(res.body.name).equals('Sanji');
  });
});

describe('POST /echo', () => {
  it('', async () => {
    const res = await request(app)
      .post('/echo')
      .set({ 'content-type': 'application/json' })
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.details.name).toBeDefined();
  });
});
