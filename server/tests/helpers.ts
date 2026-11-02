import type { Express } from 'express';
import request from 'supertest';

/**
 * Registers a user and returns the `token=...` pair from its Set-Cookie header,
 * ready to pass to `.set('Cookie', cookie)`.
 */
export async function registerAndGetCookie(app: Express, email = 'bob@example.com') {
  const res = await request(app)
    .post('/api/auth/register')
    .set({ 'content-type': 'application/json' })
    .send({ email, password: 'correct-horse', displayName: 'Bob' });

  if (res.status !== 201) {
    throw new Error(`register failed with ${res.status}: ${JSON.stringify(res.body)}`);
  }

  const setCookie = res.headers['set-cookie'] as unknown as string[];
  return setCookie[0].split(';')[0];
}
