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
  servings: 2,
  ingredients: [{ quantity: 200, unit: 'g', name: 'spaghetti' }],
  steps: ['Boil the pasta.'],
};

async function getMyId(cookie: string): Promise<string> {
  const res = await request(app).get('/api/auth/me').set('Cookie', cookie);
  return res.body.id;
}

const createRecipe = (cookie: string, body: object = validRecipe) =>
  request(app)
    .post('/api/recipes')
    .set('Cookie', cookie)
    .set({ 'content-type': 'application/json' })
    .send(body);

const getRecipe = (cookie: string, id: string) =>
  request(app).get(`/api/recipes/${id}`).set('Cookie', cookie);

const listRecipes = (cookie: string, scope: 'mine' | 'shared') =>
  request(app).get(`/api/recipes?scope=${scope}`).set('Cookie', cookie);

const share = (cookie: string, id: string, email: string) =>
  request(app)
    .post(`/api/recipes/${id}/shares`)
    .set('Cookie', cookie)
    .set({ 'content-type': 'application/json' })
    .send({ email });

const unshare = (cookie: string, id: string, userId: string) =>
  request(app).delete(`/api/recipes/${id}/shares/${userId}`).set('Cookie', cookie);

/** Alice owns a recipe, Bob gets it shared (not yet), Carol is a stranger. */
async function setup() {
  const alice = await registerAndGetCookie(app, 'alice@example.com');
  const bob = await registerAndGetCookie(app, 'bob@example.com');
  const carol = await registerAndGetCookie(app, 'carol@example.com');
  const bobId = await getMyId(bob);
  const carolId = await getMyId(carol);
  const recipe = await createRecipe(alice);
  return { alice, bob, carol, bobId, carolId, recipeId: recipe.body.id as string };
}

describe('POST /api/recipes/:id/shares', () => {
  it('returns 200 and sharedWith contains Bob (email is case-insensitive)', async () => {
    const { alice, bobId, recipeId } = await setup();

    const res = await share(alice, recipeId, 'BOB@example.com');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(recipeId);
    expect(res.body.sharedWith).toHaveLength(1);
    expect(res.body.sharedWith[0].id).toBe(bobId);
    expect(res.body.sharedWith[0].email).toBe('bob@example.com');
  });

  it('returns 404 with an unknown email', async () => {
    const { alice, recipeId } = await setup();

    const res = await share(alice, recipeId, 'nobody@example.com');

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('No user with that email');
  });

  it('returns 400 when Alice shares with herself', async () => {
    const { alice, recipeId } = await setup();

    const res = await share(alice, recipeId, 'alice@example.com');

    expect(res.status).toBe(400);
  });

  it('does not duplicate Bob when shared twice', async () => {
    const { alice, bobId, recipeId } = await setup();

    await share(alice, recipeId, 'bob@example.com');
    const res = await share(alice, recipeId, 'bob@example.com');

    expect(res.status).toBe(200);
    expect(res.body.sharedWith).toHaveLength(1);
    expect(res.body.sharedWith[0].id).toBe(bobId);
  });
});

describe('Bob, with a recipe shared with him', () => {
  it('sees it with scope=shared but not with scope=mine', async () => {
    const { alice, bob, recipeId } = await setup();
    await share(alice, recipeId, 'bob@example.com');

    const shared = await listRecipes(bob, 'shared');
    const mine = await listRecipes(bob, 'mine');

    expect(shared.status).toBe(200);
    expect(shared.body).toHaveLength(1);
    expect(shared.body[0].id).toBe(recipeId);
    expect(mine.status).toBe(200);
    expect(mine.body).toEqual([]);
  });

  it('GET returns 200 with isOwner false and no sharedWith field', async () => {
    const { alice, bob, recipeId } = await setup();
    await share(alice, recipeId, 'bob@example.com');

    const res = await getRecipe(bob, recipeId);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(recipeId);
    expect(res.body.isOwner).toBe(false);
    expect(res.body).not.toHaveProperty('sharedWith');
  });

  it('gets 404 on PATCH, DELETE, share and unshare, and the recipe is unchanged', async () => {
    const { alice, bob, bobId, recipeId } = await setup();
    await share(alice, recipeId, 'bob@example.com');

    const patch = await request(app)
      .patch(`/api/recipes/${recipeId}`)
      .set('Cookie', bob)
      .set({ 'content-type': 'application/json' })
      .send({ title: 'Hacked' });
    const del = await request(app).delete(`/api/recipes/${recipeId}`).set('Cookie', bob);
    const shareCarol = await share(bob, recipeId, 'carol@example.com');
    const unshareSelf = await unshare(bob, recipeId, bobId);

    expect(patch.status).toBe(404);
    expect(del.status).toBe(404);
    expect(shareCarol.status).toBe(404);
    expect(unshareSelf.status).toBe(404);

    const after = await getRecipe(alice, recipeId);
    expect(after.status).toBe(200);
    expect(after.body.title).toBe(validRecipe.title);
    expect(after.body.sharedWith).toHaveLength(1);
    expect(after.body.sharedWith[0].id).toBe(bobId);
  });
});

describe('Carol, a stranger', () => {
  it('gets 404 on GET', async () => {
    const { alice, carol, recipeId } = await setup();
    await share(alice, recipeId, 'bob@example.com');

    const res = await getRecipe(carol, recipeId);

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/recipes/:id/shares/:userId', () => {
  it('Alice unshares Bob: Bob gets 404 on GET and his shared list is empty', async () => {
    const { alice, bob, bobId, recipeId } = await setup();
    await share(alice, recipeId, 'bob@example.com');

    const res = await unshare(alice, recipeId, bobId);

    expect(res.status).toBe(200);
    expect(res.body.sharedWith).toEqual([]);
    expect((await getRecipe(bob, recipeId)).status).toBe(404);
    expect((await listRecipes(bob, 'shared')).body).toEqual([]);
  });
});

describe('Deleting a shared recipe', () => {
  it("removes it from Bob's shared list", async () => {
    const { alice, bob, recipeId } = await setup();
    await share(alice, recipeId, 'bob@example.com');

    const del = await request(app).delete(`/api/recipes/${recipeId}`).set('Cookie', alice);

    expect(del.status).toBe(204);
    expect((await listRecipes(bob, 'shared')).body).toEqual([]);
    expect((await getRecipe(bob, recipeId)).status).toBe(404);
  });
});
