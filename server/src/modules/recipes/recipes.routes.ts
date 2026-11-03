import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth.js';
import { validate } from '../../middleware/validate.js';
import { recipeInputSchema } from './recipes.schemas.js';
import { createRecipe, getRecipe } from './recipes.controller.js';

export function createRecipesRouter(): Router {
  const router = Router();

  router.use(requireAuth);

  router.get('/:id', getRecipe);

  router.post('/', validate(recipeInputSchema), createRecipe);

  return router;
}
