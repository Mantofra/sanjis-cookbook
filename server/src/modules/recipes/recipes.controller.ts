import { Request, Response } from 'express';
import recipesService from './recipes.service.js';

export const createRecipe = async (req: Request, res: Response) => {
  const recipe = await recipesService.createRecipe(req.userId!, req.body);
  res.status(201).json(recipe);
};

export const getRecipe = async (req: Request<{ id: string }>, res: Response) => {
  const recipe = await recipesService.getRecipe(req.userId!, req.params.id);
  res.status(200).json(recipe);
};
