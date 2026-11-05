import { Ingredient } from '../../../core/models';

function isValidServings(n: number): boolean {
  return Number.isInteger(n) && n > 0;
}

export function scaleIngredients(
  ingredients: Ingredient[],
  baseServings: number,
  targetServings: number,
): Ingredient[] {
  const factor =
    isValidServings(baseServings) && isValidServings(targetServings)
      ? targetServings / baseServings
      : 1;

  return ingredients.map((ingredient) =>
    ingredient.quantity === undefined
      ? { ...ingredient }
      : { ...ingredient, quantity: ingredient.quantity * factor },
  );
}
