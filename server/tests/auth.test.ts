import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { UserModel } from '../src/modules/users/user.model.js';

const app = createApp();

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
