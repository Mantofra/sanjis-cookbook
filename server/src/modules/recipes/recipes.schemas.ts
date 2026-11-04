import { z } from 'zod';

export const recipeInputSchema = z.object({
  title: z.string().trim().nonempty().max(120),
  description: z.string().trim().max(2000).optional(),
  servings: z.int().min(1),
  prepMinutes: z.int().min(0).optional(),
  cookMinutes: z.int().min(0).optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  ingredients: z.array(
    z.object({
      quantity: z.int().positive().optional(),
      unit: z.string().trim().optional(),
      name: z.string().nonempty(),
    }),
  ),
  steps: z.array(z.string().trim().min(1)),
});
export type RecipeInput = z.infer<typeof recipeInputSchema>;

export const recipeUpdateSchema = recipeInputSchema.partial();
export type RecipeUpdate = z.infer<typeof recipeUpdateSchema>;

export interface RecipeDto {
  id: string;
  title: string;
  description: string;
  servings: number;
  prepMinutes?: number;
  cookMinutes?: number;
  tags: string[];
  ingredients: {
    quantity?: number;
    unit?: string;
    name: string;
  }[];
  steps: string[];
  owner: { id: string; displayName: string };
  isOwner: boolean;
  sharedWith?: { id: string; email: string; displayName: string }[];
  createdAt: Date;
  updatedAt: Date;
}

export const listRecipesQuerySchema = z.object({
  scope: z.enum(['mine', 'shared']).default('mine'),
});
