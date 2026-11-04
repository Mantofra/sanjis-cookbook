import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth.js';
import { validate } from '../../middleware/validate.js';
import {
  createRecipe,
  deleteRecipe,
  getRecipe,
  listRecipes,
  updateRecipe,
} from './recipes.controller.js';
import { recipeInputSchema, recipeUpdateSchema } from './recipes.schemas.js';

export function createRecipesRouter(): Router {
  const router = Router();

  router.use(requireAuth);

  router.get('/:id', getRecipe);
  router.get('/', listRecipes);

  router.post('/', validate(recipeInputSchema), createRecipe);

  router.patch('/:id', validate(recipeUpdateSchema), updateRecipe);

  router.delete('/:id', deleteRecipe);

  return router;
}
