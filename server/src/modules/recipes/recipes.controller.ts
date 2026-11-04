import { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../errors/app-error.js';
import { listRecipesQuerySchema } from './recipes.schemas.js';
import recipesService from './recipes.service.js';

export const createRecipe = async (req: Request, res: Response) => {
  const recipe = await recipesService.createRecipe(req.userId!, req.body);
  res.status(201).json(recipe);
};

export const getRecipe = async (req: Request<{ id: string }>, res: Response) => {
  const recipe = await recipesService.getRecipe(req.userId!, req.params.id);
  res.status(200).json(recipe);
};

export const listRecipes = async (req: Request, res: Response) => {
  const result = listRecipesQuerySchema.safeParse(req.query);
  if (!result.success)
    throw new AppError(400, 'Invalid query', z.flattenError(result.error).fieldErrors);

  const recipes = await recipesService.listRecipes(req.userId!, result.data.scope);
  res.status(200).json(recipes);
};

export const updateRecipe = async (req: Request<{ id: string }>, res: Response) => {
  const result = await recipesService.updateRecipe(req.userId!, req.params.id, req.body);
  res.status(200).json(result);
};

export const deleteRecipe = async (req: Request<{ id: string }>, res: Response) => {
  await recipesService.deleteRecipe(req.userId!, req.params.id);
  res.sendStatus(204);
};
