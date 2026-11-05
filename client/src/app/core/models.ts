export interface User {
  id: string;
  email: string;
  displayName: string;
}

export interface Ingredient {
  quantity?: number;
  unit?: string;
  name: string;
}

export type RecipeScope = 'mine' | 'shared';

export interface Recipe {
  id: string;
  title: string;
  description?: string;
  servings: number;
  prepMinutes?: number;
  cookMinutes?: number;
  tags: string[];
  ingredients: Ingredient[];
  steps: string[];
  owner: { id: string; displayName: string };
  isOwner: boolean;
  sharedWith?: { id: string; email: string; displayName: string }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RecipeInput {
  title: string;
  description?: string;
  servings: number;
  prepMinutes?: number;
  cookMinutes?: number;
  tags?: string[];
  ingredients: Ingredient[];
  steps: string[];
}
