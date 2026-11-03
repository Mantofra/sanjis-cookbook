import { AppError } from '../../errors/app-error.js';
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
    const recipe = await RecipeModel.findOne({ _id: id, owner: userId }).populate<{
      owner: OwnerRef;
      sharedWith: SharedUserRef[];
    }>(RECIPE_POPULATE);

    if (!recipe) throw new AppError(404, 'Recipe not found');
    if (recipe.owner._id.toString() !== userId) throw new AppError(404, 'Recipe not found');
    return this.toRecipeDto(recipe, userId);
  }
}

export default new RecipesService();
