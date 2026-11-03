import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { UserModel } from '../src/modules/users/user.model.js';
import { registerAndGetCookie } from './helpers.js';

// A fresh app per test gives each test its own rate-limit counter.
let app: Express;

beforeEach(() => {
  app = createApp();
});

const validBody = {
  email: 'bob@example.com',
  password: 'correct-horse',
  displayName: 'Bob',
};

const register = (body: object) =>
  request(app).post('/api/auth/register').set({ 'content-type': 'application/json' }).send(body);

describe('POST /api/auth/register', () => {
  // The unique index on email must exist before the duplicate test runs.
  beforeAll(async () => {
    await UserModel.init();
  });

  it('returns 201 with the user and sets an httpOnly token cookie', async () => {
    const res = await register(validBody);

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.email).toBe('bob@example.com');
    expect(res.body.displayName).toBe('Bob');
    expect(res.body.passwordHash).toBeUndefined();

    const cookie = (res.headers['set-cookie'] as unknown as string[])[0];
    expect(cookie.startsWith('token=')).toBe(true);
    expect(cookie).toContain('HttpOnly');
  });

  it('trims and lowercases the email', async () => {
    const res = await register({ ...validBody, email: ' Bob@Example.com ' });

    expect(res.status).toBe(201);
    expect(res.body.email).toBe('bob@example.com');
  });

  it('returns 409 when the email is already registered, ignoring case', async () => {
    await register(validBody);
    const res = await register({ ...validBody, email: 'BOB@example.com' });

    expect(res.status).toBe(409);
  });

  it('returns 400 with details.password when the password is 7 characters', async () => {
    const res = await register({ ...validBody, password: '1234567' });

    expect(res.status).toBe(400);
    expect(res.body.error.details.password).toBeDefined();
  });

  it('returns 400 with details.displayName when displayName is missing', async () => {
    const res = await register({ email: validBody.email, password: validBody.password });

    expect(res.status).toBe(400);
    expect(res.body.error.details.displayName).toBeDefined();
  });

  it('stores an argon2 hash, not the plain password', async () => {
    await register(validBody);
    const user = await UserModel.findOne({ email: 'bob@example.com' }).select('+passwordHash');

    expect(user).not.toBeNull();
    expect(user!.passwordHash).not.toBe(validBody.password);
    expect(user!.passwordHash.startsWith('$argon2')).toBe(true);
  });
});

const login = (body: object) =>
  request(app).post('/api/auth/login').set({ 'content-type': 'application/json' }).send(body);

describe('POST /api/auth/login', () => {
  it('returns 200 with the user and sets the token cookie', async () => {
    await register(validBody);
    const res = await login({ email: validBody.email, password: validBody.password });

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('bob@example.com');
    expect(res.body.passwordHash).toBeUndefined();

    const cookie = (res.headers['set-cookie'] as unknown as string[])[0];
    expect(cookie.startsWith('token=')).toBe(true);
    expect(cookie).toContain('HttpOnly');

    // The cookie must hold a real token: it should authenticate /me.
    const me = await request(app).get('/api/auth/me').set('Cookie', cookie.split(';')[0]);
    expect(me.status).toBe(200);
  });

  it('ignores email case', async () => {
    await register(validBody);
    const res = await login({ email: 'BOB@EXAMPLE.COM', password: validBody.password });

    expect(res.status).toBe(200);
  });

  it('returns 401 for a wrong password', async () => {
    await register(validBody);
    const res = await login({ email: validBody.email, password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('returns 401 with the same message for an unknown email', async () => {
    const res = await login({ email: 'nobody@example.com', password: validBody.password });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });
});

describe('GET /api/auth/me', () => {
  it('returns 200 with the logged-in user', async () => {
    const cookie = await registerAndGetCookie(app);
    const res = await request(app).get('/api/auth/me').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('bob@example.com');
    expect(res.body.displayName).toBe('Bob');
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('returns 401 without a cookie', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Not authenticated');
  });

  it('returns 401 with a garbage token', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', 'token=garbage');

    expect(res.status).toBe(401);
  });

  it('returns 401 for a token signed with a different secret', async () => {
    const { body } = await register(validBody);
    const forged = jwt.sign({ sub: body.id }, 'not-the-real-secret', { expiresIn: '7d' });
    const res = await request(app).get('/api/auth/me').set('Cookie', `token=${forged}`);

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('returns 204 and clears the token cookie', async () => {
    const cookie = await registerAndGetCookie(app);
    const res = await request(app).post('/api/auth/logout').set('Cookie', cookie);

    expect(res.status).toBe(204);
    const cleared = (res.headers['set-cookie'] as unknown as string[])[0];
    expect(cleared.startsWith('token=;')).toBe(true);
    expect(cleared).toContain('Expires=Thu, 01 Jan 1970');
  });

  it('returns 401 without a cookie', async () => {
    const res = await request(app).post('/api/auth/logout');

    expect(res.status).toBe(401);
  });
});
