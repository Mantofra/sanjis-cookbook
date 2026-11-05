import { AppError } from '../../errors/app-error.js';
import authService from '../auth/auth.service.js';
import {
  OwnerRef,
  PopulatedRecipeDocument,
  RECIPE_POPULATE,
  RecipeModel,
  SharedUserRef,
} from './recipe.model.js';
import { RecipeDto, RecipeInput } from './recipes.schemas.js';

class RecipesService {
  toRecipeDto(doc: PopulatedRecipeDocument, userId: string): RecipeDto {
    const isOwner = doc.owner._id.toString() === userId;

    return {
      id: doc._id.toString(),
      title: doc.title,
      description: doc.description ?? '',
      servings: doc.servings,
      prepMinutes: doc.prepMinutes,
      cookMinutes: doc.cookMinutes,
      tags: doc.tags,
      ingredients: doc.ingredients.map((ing) => ({
        quantity: ing.quantity,
        unit: ing.unit,
        name: ing.name,
      })),
      steps: doc.steps,
      owner: {
        id: doc.owner._id.toString(),
        displayName: doc.owner.displayName,
      },
      isOwner,
      ...(isOwner
        ? {
            sharedWith: doc.sharedWith.map((u) => ({
              id: u._id.toString(),
              email: u.email,
              displayName: u.displayName,
            })),
          }
        : {}),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async createRecipe(userId: string, input: RecipeInput): Promise<RecipeDto> {
    const recipe = await RecipeModel.create({ ...input, owner: userId });
    const populated = await recipe.populate<{
      owner: OwnerRef;
      sharedWith: SharedUserRef[];
    }>(RECIPE_POPULATE);
    return this.toRecipeDto(populated, userId);
  }

  async getRecipe(userId: string, id: string): Promise<RecipeDto> {
    const recipe = await RecipeModel.findOne({
      _id: id,
      $or: [{ owner: userId }, { sharedWith: userId }],
    }).populate<{
      owner: OwnerRef;
      sharedWith: SharedUserRef[];
    }>(RECIPE_POPULATE);

    if (!recipe) throw new AppError(404, 'Recipe not found');
    return this.toRecipeDto(recipe, userId);
  }

  async listRecipes(userId: string, scope: 'mine' | 'shared'): Promise<RecipeDto[]> {
    const filter = scope === 'mine' ? { owner: userId } : { sharedWith: userId };

    const recipes = await RecipeModel.find(filter).sort({ updatedAt: -1, _id: -1 }).populate<{
      owner: OwnerRef;
      sharedWith: SharedUserRef[];
    }>(RECIPE_POPULATE);
    return recipes.map((recipe) => this.toRecipeDto(recipe, userId));
  }

  async updateRecipe(userId: string, id: string, input: object): Promise<RecipeDto> {
    const recipe = await RecipeModel.findOneAndUpdate({ _id: id, owner: userId }, input, {
      returnDocument: 'after',
      runValidators: true,
    }).populate<{
      owner: OwnerRef;
      sharedWith: SharedUserRef[];
    }>(RECIPE_POPULATE);
    if (!recipe) throw new AppError(404, 'Recipe not found');
    return this.toRecipeDto(recipe, userId);
  }

  async deleteRecipe(userId: string, id: string): Promise<void> {
    const recipe = await RecipeModel.findOneAndDelete({ _id: id, owner: userId }).populate<{
      owner: OwnerRef;
      sharedWith: SharedUserRef[];
    }>(RECIPE_POPULATE);

    if (!recipe) throw new AppError(404, 'Recipe not found');
    return;
  }

  async shareRecipe(ownerId: string, recipeId: string, email: string): Promise<RecipeDto> {
    const targetUserId = await authService.getUserId(email);
    if (targetUserId.toString() === ownerId) throw new AppError(400, 'Cannot share with owner');
    const recipe = await RecipeModel.findOneAndUpdate(
      { _id: recipeId, owner: ownerId },
      { $addToSet: { sharedWith: targetUserId } },
      {
        returnDocument: 'after',
        runValidators: true,
      },
    ).populate<{
      owner: OwnerRef;
      sharedWith: SharedUserRef[];
    }>(RECIPE_POPULATE);
    if (!recipe) throw new AppError(404, 'Recipe not found');
    return this.toRecipeDto(recipe, ownerId);
  }

  async unshareRecipe(ownerId: string, recipeId: string, targetUserId: string): Promise<RecipeDto> {
    const recipe = await RecipeModel.findOneAndUpdate(
      { _id: recipeId, owner: ownerId },
      { $pull: { sharedWith: targetUserId } },
      {
        returnDocument: 'after',
        runValidators: true,
      },
    ).populate<{
      owner: OwnerRef;
      sharedWith: SharedUserRef[];
    }>(RECIPE_POPULATE);
    if (!recipe) throw new AppError(404, 'Recipe not found');
    return this.toRecipeDto(recipe, ownerId);
  }
}

export default new RecipesService();
