import { Pipe, PipeTransform } from '@angular/core';

/** How close the fractional part must be to a target to snap to it. */
const TOLERANCE = 0.05;

/** Common kitchen fractions and the glyph shown for each. */
const FRACTIONS = [
  { value: 1 / 4, glyph: '¼' },
  { value: 1 / 3, glyph: '⅓' },
  { value: 1 / 2, glyph: '½' },
  { value: 2 / 3, glyph: '⅔' },
  { value: 3 / 4, glyph: '¾' },
];

@Pipe({
  name: 'quantity',
})
export class QuantityPipe implements PipeTransform {
  transform(value: number | undefined): string {
    if (value === undefined) return '';
    if (value >= 10) return Math.round(value).toString();

    // Rule 3: split into whole + fractional part
    const whole = Math.floor(value);
    const fraction = value - whole;

    if (fraction <= TOLERANCE) return whole.toString();
    if (fraction >= 1 - TOLERANCE) return (whole + 1).toString();

    // Some windows overlap (¼/⅓ and ⅔/¾), so pick the closest candidate
    const closest = FRACTIONS.reduce((best, f) =>
      Math.abs(fraction - f.value) < Math.abs(fraction - best.value) ? f : best,
    );
    if (Math.abs(fraction - closest.value) <= TOLERANCE) {
      return (whole === 0 ? '' : whole.toString()) + closest.glyph;
    }

    // Rule 4: up to 2 decimals; Number() drops trailing zeros ("1.50" → 1.5)
    return Number(value.toFixed(2)).toString();
  }
}
