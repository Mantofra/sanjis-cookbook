import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth.js';
import { validate } from '../../middleware/validate.js';
import {
  createRecipe,
  deleteRecipe,
  getRecipe,
  listRecipes,
  shareRecipe,
  unshareRecipe,
  updateRecipe,
} from './recipes.controller.js';
import { recipeInputSchema, recipeShareSchema, recipeUpdateSchema } from './recipes.schemas.js';

export function createRecipesRouter(): Router {
  const router = Router();

  router.use(requireAuth);

  router.get('/:id', getRecipe);
  router.get('/', listRecipes);

  router.post('/', validate(recipeInputSchema), createRecipe);
  router.post('/:id/shares', validate(recipeShareSchema), shareRecipe);

  router.patch('/:id', validate(recipeUpdateSchema), updateRecipe);

  router.delete('/:id', deleteRecipe);
  router.delete('/:id/shares/:userId', unshareRecipe);

  return router;
}
