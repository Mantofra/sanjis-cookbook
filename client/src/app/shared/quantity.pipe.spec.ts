import { QuantityPipe } from './quantity.pipe';

describe('QuantityPipe', () => {
  // A pure pipe is just a class: no TestBed needed
  const pipe = new QuantityPipe();

  it('returns an empty string for undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });

  it.each([
    [0.5, '½'],
    [2.25, '2¼'],
    [1.3333, '1⅓'],
    [0.6667, '⅔'],
  ])('shows %s as the fraction glyph %s', (value, expected) => {
    expect(pipe.transform(value)).toBe(expected);
  });

  it.each([
    [3, '3'],
    [1.97, '2'],
    [12.4, '12'],
  ])('rounds %s to the whole number %s', (value, expected) => {
    expect(pipe.transform(value)).toBe(expected);
  });

  it.each([
    [0.1, '0.1'],
    [1.15, '1.15'],
  ])('shows %s with up to 2 decimals as %s', (value, expected) => {
    expect(pipe.transform(value)).toBe(expected);
  });
});
