import { describe, expect, it } from 'vitest';
import { SHAPES_FOR_UI, SHAPE_LABELS, shapePathD } from './shapes.js';

describe('SHAPES_FOR_UI', () => {
  it('has 15 entries (drops plain square, includes none)', () => {
    expect(SHAPES_FOR_UI).toHaveLength(15);
    expect(SHAPES_FOR_UI).not.toContain('square');
    expect(SHAPES_FOR_UI).toContain('none');
  });
});

describe('shapePathD', () => {
  for (const shape of SHAPES_FOR_UI) {
    it(`returns a non-empty path string for ${shape}`, () => {
      const d = shapePathD(shape, 100);
      expect(typeof d).toBe('string');
      expect(d.length).toBeGreaterThan(5);
      expect(d.trim().endsWith('Z')).toBe(true);
    });
  }

  it('returns a different d for two different shapes', () => {
    expect(shapePathD('circle', 100)).not.toBe(shapePathD('triangle', 100));
  });

  it('scales with size', () => {
    const d100 = shapePathD('triangle', 100);
    const d200 = shapePathD('triangle', 200);
    expect(d100).not.toBe(d200);
  });
});

describe('SHAPE_LABELS', () => {
  for (const shape of SHAPES_FOR_UI) {
    it(`has a label for ${shape}`, () => {
      expect(SHAPE_LABELS[shape]).toBeTruthy();
    });
  }
});
