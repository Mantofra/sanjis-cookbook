import request from 'supertest';
import { createApp } from '../src/app';
import { describe, it, expect } from 'vitest';

const validBody = {
  email: 'bob@example.com',
  password: 'correct-horse',
  displayName: 'Bob',
};

const app = createApp();

describe('GET /api/health', () => {
  it("checks res.headers[x-content-type-options] equals to 'nosniff'", async () => {
    const res = await request(createApp()).get('/api/health');

    expect(res.headers['x-content-type-options']).toEqual('nosniff');
  });
});

const login = (body: object) =>
  request(app).post('/api/auth/login').set({ 'content-type': 'application/json' }).send(body);

describe('POST /api/auth/login', () => {
  it('checks rate limit', async () => {
    for (let i = 0; i < 10; i++) {
      const res = await login(validBody);

      expect(res.status).toBe(401);
    }
    const res = await login(validBody);

    expect(res.status).toBe(429);
  });
});
