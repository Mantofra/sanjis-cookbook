import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { registerAndGetCookie } from './helpers.js';

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

const updateRecipe = (cookie: string, id: string, body: object) =>
  request(app)
    .patch(`/api/recipes/${id}`)
    .set('Cookie', cookie)
    .set({ 'content-type': 'application/json' })
    .send(body);

const getRecipe = (cookie: string, id: string) =>
  request(app).get(`/api/recipes/${id}`).set('Cookie', cookie);

const deleteRecipe = (cookie: string, id: string) =>
  request(app).delete(`/api/recipes/${id}`).set('Cookie', cookie);

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

describe('GET /api/recipes', () => {
  it('returns only my recipes, newest first', async () => {
    const otherCookie = await registerAndGetCookie(app, 'alice@example.com');
    await createRecipe(otherCookie, { ...validRecipe, title: "Alice's recipe" });

    const cookie = await registerAndGetCookie(app);
    const myId = await getMyId(cookie);
    await createRecipe(cookie, { ...validRecipe, title: 'Older' });
    await createRecipe(cookie, { ...validRecipe, title: 'Newer' });

    const res = await request(app).get('/api/recipes').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    for (const recipe of res.body) {
      expect(recipe.owner.id).toBe(myId);
    }
    expect(res.body.map((r: { title: string }) => r.title)).toEqual(['Newer', 'Older']);
    expect(Date.parse(res.body[0].updatedAt)).toBeGreaterThanOrEqual(
      Date.parse(res.body[1].updatedAt),
    );
  });

  it('returns 200 with ?scope=mine', async () => {
    const cookie = await registerAndGetCookie(app);
    await createRecipe(cookie, validRecipe);

    const res = await request(app).get('/api/recipes?scope=mine').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('returns 200 and [] with ?scope=shared (until task 5.1)', async () => {
    const cookie = await registerAndGetCookie(app);
    await createRecipe(cookie, validRecipe);

    const res = await request(app).get('/api/recipes?scope=shared').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 400 with wrong scope', async () => {
    const cookie = await registerAndGetCookie(app);
    const res = await request(app).get('/api/recipes?scope=banana').set('Cookie', cookie);

    expect(res.status).toBe(400);
  });

  it('returns 401 without a cookie', async () => {
    const res = await request(app).get('/api/recipes');

    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/recipes/:id', () => {
  it('returns 200 with the new title; other fields unchanged', async () => {
    const cookie = await registerAndGetCookie(app);
    const created = await createRecipe(cookie, validRecipe);

    const res = await updateRecipe(cookie, created.body.id, { title: 'Pasta alla carbonara' });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.id);
    expect(res.body.title).toBe('Pasta alla carbonara');
    expect(res.body.description).toBe(validRecipe.description);
    expect(res.body.servings).toBe(validRecipe.servings);
    expect(res.body.tags).toEqual(validRecipe.tags);
    expect(res.body.ingredients).toEqual(created.body.ingredients);
    expect(res.body.steps).toEqual(validRecipe.steps);
    expect(res.body.isOwner).toBe(true);
  });

  it('returns 400 with details.servings when servings is 0', async () => {
    const cookie = await registerAndGetCookie(app);
    const created = await createRecipe(cookie, validRecipe);

    const res = await updateRecipe(cookie, created.body.id, { servings: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error.details.servings).toBeDefined();
  });

  it('returns 404 when another user patches my recipe, and the recipe is unchanged', async () => {
    const cookie = await registerAndGetCookie(app);
    const created = await createRecipe(cookie, validRecipe);
    const otherCookie = await registerAndGetCookie(app, 'alice@example.com');

    const res = await updateRecipe(otherCookie, created.body.id, { title: 'Hacked' });

    expect(res.status).toBe(404);
    const after = await getRecipe(cookie, created.body.id);
    expect(after.status).toBe(200);
    expect(after.body.title).toBe(validRecipe.title);
  });

  it('returns 401 without a cookie', async () => {
    const cookie = await registerAndGetCookie(app);
    const created = await createRecipe(cookie, validRecipe);

    const res = await request(app)
      .patch(`/api/recipes/${created.body.id}`)
      .set({ 'content-type': 'application/json' })
      .send({ title: 'Nope' });

    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/recipes/:id', () => {
  it('returns 204, then GET returns 404', async () => {
    const cookie = await registerAndGetCookie(app);
    const created = await createRecipe(cookie, validRecipe);

    const res = await deleteRecipe(cookie, created.body.id);

    expect(res.status).toBe(204);
    const after = await getRecipe(cookie, created.body.id);
    expect(after.status).toBe(404);
  });

  it('returns 404 when another user deletes my recipe, and the recipe still exists', async () => {
    const cookie = await registerAndGetCookie(app);
    const created = await createRecipe(cookie, validRecipe);
    const otherCookie = await registerAndGetCookie(app, 'alice@example.com');

    const res = await deleteRecipe(otherCookie, created.body.id);

    expect(res.status).toBe(404);
    const after = await getRecipe(cookie, created.body.id);
    expect(after.status).toBe(200);
  });

  it('returns 401 without a cookie', async () => {
    const cookie = await registerAndGetCookie(app);
    const created = await createRecipe(cookie, validRecipe);

    const res = await request(app).delete(`/api/recipes/${created.body.id}`);

    expect(res.status).toBe(401);
  });
});
