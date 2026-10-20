import { describe, expect, it } from 'vitest';
import { getOndaDrawRect } from '../src/export/ondaRenderer';

describe('ONDA compositor geometry', () => {
  it('centers contained media in clip-local coordinates', () => {
    const rect = getOndaDrawRect(1920, 1080, 1000, 1000, 'contain');
    expect(rect.x).toBeCloseTo(-500);
    expect(rect.y).toBeCloseTo(-281.25);
    expect(rect.width).toBeCloseTo(1000);
    expect(rect.height).toBeCloseTo(562.5);
  });

  it('centers covered media beyond the clipped box', () => {
    const rect = getOndaDrawRect(1920, 1080, 1000, 1000, 'cover');
    expect(rect.x).toBeCloseTo(-888.8889);
    expect(rect.y).toBeCloseTo(-500);
    expect(rect.width).toBeCloseTo(1777.7778);
    expect(rect.height).toBeCloseTo(1000);
  });
});
