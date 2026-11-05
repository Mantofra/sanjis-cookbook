import { Ingredient } from '../../../core/models';
import { scaleIngredients } from './scaling';

describe('scaleIngredients', () => {
  it('halves 200 g when going from 4 to 2 servings', () => {
    const result = scaleIngredients([{ quantity: 200, unit: 'g', name: 'flour' }], 4, 2);
    expect(result[0].quantity).toBe(100);
  });

  it('handles non-terminating fractions (1 for 3 → 1)', () => {
    const result = scaleIngredients([{ quantity: 1, name: 'egg' }], 3, 1);
    // floats aren't exact: 1/3 = 0.333333…, so compare approximately
    expect(result[0].quantity).toBeCloseTo(0.3333, 4);
  });

  it('leaves ingredients without quantity untouched', () => {
    const result = scaleIngredients([{ unit: 'pinch', name: 'salt' }], 4, 2);
    expect(result[0]).toEqual({ unit: 'pinch', name: 'salt' });
    expect(result[0]).not.toHaveProperty('quantity'); // not even `quantity: undefined`
  });

  it('never changes unit or name', () => {
    const result = scaleIngredients([{ quantity: 2, unit: 'tbsp', name: 'oil' }], 2, 6);
    expect(result[0].unit).toBe('tbsp');
    expect(result[0].name).toBe('oil');
  });

  it('does not mutate the input array or its objects', () => {
    const input: Ingredient[] = [{ quantity: 200, unit: 'g', name: 'flour' }, { name: 'salt' }];
    const snapshot = structuredClone(input); // deep copy taken BEFORE the call

    const result = scaleIngredients(input, 4, 2);

    expect(input).toEqual(snapshot); // contents unchanged
    expect(result).not.toBe(input); // a new array…
    expect(result[0]).not.toBe(input[0]); // …with new objects
  });

  it.each([0, -2, 2.5, NaN])('uses factor 1 when target is %s', (target) => {
    const result = scaleIngredients([{ quantity: 200, unit: 'g', name: 'flour' }], 4, target);
    expect(result[0].quantity).toBe(200);
  });
});
