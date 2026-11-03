import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { registerAndGetCookie } from './helpers.js';

// A fresh app per test gives each test its own rate-limit counter.
let app: Express;

beforeEach(() => {
  app = createApp();
});

const validRecipe = {
  title: 'Pasta al pomodoro',
  description: 'Simple and quick.',
  servings: 2,
  prepMinutes: 5,
  cookMinutes: 15,
  tags: ['pasta', 'vegetarian'],
  ingredients: [
    { quantity: 200, unit: 'g', name: 'spaghetti' },
    { quantity: 400, unit: 'g', name: 'tomato passata' },
    { name: 'salt' },
  ],
  steps: ['Boil the pasta.', 'Heat the sauce.', 'Mix and serve.'],
};

/** Returns the id of the user the cookie belongs to. */
async function getMyId(cookie: string): Promise<string> {
  const res = await request(app).get('/api/auth/me').set('Cookie', cookie);
  return res.body.id;
}

const createRecipe = (cookie: string, body: object) =>
  request(app)
    .post('/api/recipes')
    .set('Cookie', cookie)
    .set({ 'content-type': 'application/json' })
    .send(body);

describe('POST /api/recipes', () => {
  it('returns 201 with the recipe, owned by me', async () => {
    const cookie = await registerAndGetCookie(app);
    const myId = await getMyId(cookie);

    const res = await createRecipe(cookie, validRecipe);

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.title).toBe(validRecipe.title);
    expect(res.body.servings).toBe(2);
    expect(res.body.ingredients).toHaveLength(3);
    expect(res.body.isOwner).toBe(true);
    expect(res.body.owner.id).toBe(myId);
    expect(res.body.owner.displayName).toBe('Bob');
    expect(res.body.sharedWith).toEqual([]);
    expect(res.body.createdAt).toBeDefined();
    expect(res.body.updatedAt).toBeDefined();
  });

  it('accepts a recipe without the optional fields', async () => {
    const cookie = await registerAndGetCookie(app);

    const res = await createRecipe(cookie, {
      title: 'Toast',
      servings: 1,
      ingredients: [{ name: 'bread' }],
      steps: ['Toast the bread.'],
    });

    expect(res.status).toBe(201);
    expect(res.body.tags).toEqual([]);
  });

  it('ignores an owner in the body: the recipe is still mine', async () => {
    const otherCookie = await registerAndGetCookie(app, 'alice@example.com');
    const otherId = await getMyId(otherCookie);
    const cookie = await registerAndGetCookie(app);
    const myId = await getMyId(cookie);

    const res = await createRecipe(cookie, { ...validRecipe, owner: otherId });

    expect(res.status).toBe(201);
    expect(res.body.owner.id).toBe(myId);
    expect(res.body.isOwner).toBe(true);
  });

  it('returns 400 with details.servings when servings is 0', async () => {
    const cookie = await registerAndGetCookie(app);

    const res = await createRecipe(cookie, { ...validRecipe, servings: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error.details.servings).toBeDefined();
  });

  it('returns 400 with details.title when the title is missing', async () => {
    const cookie = await registerAndGetCookie(app);
    const res = await createRecipe(cookie, { ...validRecipe, title: undefined });

    expect(res.status).toBe(400);
    expect(res.body.error.details.title).toBeDefined();
  });

  it('returns 401 without a cookie', async () => {
    const res = await request(app)
      .post('/api/recipes')
      .set({ 'content-type': 'application/json' })
      .send(validRecipe);

    expect(res.status).toBe(401);
  });
});

describe('GET /api/recipes/:id', () => {
  it('returns 200 with my recipe', async () => {
    const cookie = await registerAndGetCookie(app);
    const created = await createRecipe(cookie, validRecipe);

    const res = await request(app).get(`/api/recipes/${created.body.id}`).set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.id);
    expect(res.body.title).toBe(validRecipe.title);
    expect(res.body.isOwner).toBe(true);
    expect(res.body.owner.displayName).toBe('Bob');
  });

  it("returns 404 when another user asks for my recipe (not 403: don't reveal it exists)", async () => {
    const cookie = await registerAndGetCookie(app);
    const created = await createRecipe(cookie, validRecipe);
    const otherCookie = await registerAndGetCookie(app, 'alice@example.com');

    const res = await request(app)
      .get(`/api/recipes/${created.body.id}`)
      .set('Cookie', otherCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Recipe not found');
  });

  it('returns 404 for an id that is not a valid ObjectId', async () => {
    const cookie = await registerAndGetCookie(app);

    const res = await request(app).get('/api/recipes/not-an-id').set('Cookie', cookie);

    expect(res.status).toBe(404);
  });

  it('returns 401 without a cookie', async () => {
    const cookie = await registerAndGetCookie(app);
    const created = await createRecipe(cookie, validRecipe);

    const res = await request(app).get(`/api/recipes/${created.body.id}`);

    expect(res.status).toBe(401);
  });
});
