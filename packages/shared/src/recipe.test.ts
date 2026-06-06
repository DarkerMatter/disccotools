import { describe, expect, it } from 'vitest';
import {
  BackgroundSchema,
  DEFAULT_SIZE,
  IconLayerSchema,
  ImageLayerSchema,
  LayerSchema,
  MAX_LAYERS,
  OpacitySchema,
  RecipeSchema,
  ShapeSchema,
  SizeSchema,
  TextLayerSchema,
  createEmptyRecipe,
  type Recipe,
} from './recipe.js';

describe('SizeSchema', () => {
  it.each([32, 64, 128, 256, 512, 1024] as const)(
    'accepts allowed size %i',
    (s) => {
      expect(SizeSchema.parse(s)).toBe(s);
    },
  );

  it('rejects sizes outside the allowed set', () => {
    expect(() => SizeSchema.parse(200)).toThrow();
    expect(() => SizeSchema.parse('256')).toThrow();
  });
});

describe('OpacitySchema', () => {
  it('accepts 0..1', () => {
    expect(OpacitySchema.parse(0)).toBe(0);
    expect(OpacitySchema.parse(0.5)).toBe(0.5);
    expect(OpacitySchema.parse(1)).toBe(1);
  });

  it('rejects out-of-range', () => {
    expect(() => OpacitySchema.parse(-0.1)).toThrow();
    expect(() => OpacitySchema.parse(1.1)).toThrow();
  });
});

describe('ShapeSchema', () => {
  it.each([
    'circle',
    'square',
    'rounded-square',
    'scalloped',
    'gear',
    'shield-rounded-pointed',
    'shield-flat-pointed',
    'shield-narrow-pointed',
    'shield-rounded-curved',
    'shield-wide-curved',
    'banner',
    'hexagon',
    'diamond',
    'star',
    'triangle',
  ] as const)(
    'accepts shape %s',
    (s) => {
      expect(ShapeSchema.parse(s)).toBe(s);
    },
  );

  it('rejects unknown shapes', () => {
    expect(() => ShapeSchema.parse('octagon')).toThrow();
  });
});

describe('BackgroundSchema', () => {
  it('accepts transparent', () => {
    expect(BackgroundSchema.parse({ kind: 'transparent' })).toEqual({
      kind: 'transparent',
    });
  });

  it('accepts solid with color and opacity', () => {
    expect(
      BackgroundSchema.parse({
        kind: 'solid',
        color: '#000',
        opacity: 0.5,
      }),
    ).toMatchObject({ kind: 'solid', color: '#000', opacity: 0.5 });
  });

  it('accepts gradient with from/to/angle/opacity', () => {
    expect(
      BackgroundSchema.parse({
        kind: 'gradient',
        from: '#000',
        to: '#fff',
        angle: 45,
        opacity: 1,
      }),
    ).toMatchObject({ kind: 'gradient', angle: 45 });
  });

  it('rejects solid without opacity', () => {
    expect(() =>
      BackgroundSchema.parse({ kind: 'solid', color: '#000' }),
    ).toThrow();
  });
});

describe('IconLayerSchema', () => {
  it('accepts a complete icon layer', () => {
    const layer = {
      id: 'l1',
      kind: 'icon' as const,
      iconset: 'lucide',
      name: 'rocket',
      color: '#fff',
      x: 0.5,
      y: 0.5,
      rotation: 0,
      scale: 1,
      opacity: 1,
    };
    // The schema's transform normalizes a bare string into the structured
    // solid form, so equality is against the structured shape.
    expect(IconLayerSchema.parse(layer)).toEqual({
      ...layer,
      color: { kind: 'solid', color: '#fff' },
    });
  });

  it('rejects when scale is zero or negative', () => {
    const bad = {
      id: 'l1',
      kind: 'icon',
      iconset: 'lucide',
      name: 'rocket',
      color: '#fff',
      x: 0.5,
      y: 0.5,
      rotation: 0,
      scale: 0,
      opacity: 1,
    };
    expect(() => IconLayerSchema.parse(bad)).toThrow();
  });

  it('accepts a solid icon color shape', () => {
    const layer = {
      id: 'l1',
      kind: 'icon' as const,
      iconset: 'lucide',
      name: 'rocket',
      color: { kind: 'solid', color: '#fff' },
      x: 0.5,
      y: 0.5,
      rotation: 0,
      scale: 1,
      opacity: 1,
    };
    expect(IconLayerSchema.parse(layer).color).toEqual({
      kind: 'solid',
      color: '#fff',
    });
  });

  it('accepts a gradient icon color shape', () => {
    const layer = {
      id: 'l1',
      kind: 'icon' as const,
      iconset: 'lucide',
      name: 'rocket',
      color: { kind: 'gradient', from: '#fff', to: '#000', angle: 45 },
      x: 0.5,
      y: 0.5,
      rotation: 0,
      scale: 1,
      opacity: 1,
    };
    expect(IconLayerSchema.parse(layer).color).toMatchObject({
      kind: 'gradient',
      angle: 45,
    });
  });

  it('upgrades a legacy string color to the solid form', () => {
    const layer = {
      id: 'l1',
      kind: 'icon' as const,
      iconset: 'lucide',
      name: 'rocket',
      color: '#abc',
      x: 0.5,
      y: 0.5,
      rotation: 0,
      scale: 1,
      opacity: 1,
    };
    expect(IconLayerSchema.parse(layer).color).toEqual({
      kind: 'solid',
      color: '#abc',
    });
  });
});

describe('TextLayerSchema', () => {
  it('accepts a complete text layer', () => {
    const layer = {
      id: 't1',
      kind: 'text' as const,
      text: 'hi',
      font: 'system-ui',
      color: '#fff',
      size: 0.4,
      x: 0.5,
      y: 0.5,
      rotation: 0,
      scale: 1,
      opacity: 1,
    };
    expect(TextLayerSchema.parse(layer)).toEqual(layer);
  });

  it('accepts text at the 200-character cap', () => {
    const layer = {
      id: 't1',
      kind: 'text' as const,
      text: 'a'.repeat(200),
      font: 'system-ui',
      color: '#fff',
      size: 0.4,
      x: 0.5,
      y: 0.5,
      rotation: 0,
      scale: 1,
      opacity: 1,
    };
    expect(() => TextLayerSchema.parse(layer)).not.toThrow();
  });

  it('rejects text longer than 200 characters', () => {
    const layer = {
      id: 't1',
      kind: 'text' as const,
      text: 'a'.repeat(201),
      font: 'system-ui',
      color: '#fff',
      size: 0.4,
      x: 0.5,
      y: 0.5,
      rotation: 0,
      scale: 1,
      opacity: 1,
    };
    expect(() => TextLayerSchema.parse(layer)).toThrow();
  });

  it('rejects font names longer than 120 characters', () => {
    const layer = {
      id: 't1',
      kind: 'text' as const,
      text: 'hi',
      font: 'x'.repeat(121),
      color: '#fff',
      size: 0.4,
      x: 0.5,
      y: 0.5,
      rotation: 0,
      scale: 1,
      opacity: 1,
    };
    expect(() => TextLayerSchema.parse(layer)).toThrow();
  });
});

describe('ImageLayerSchema', () => {
  it('accepts a complete image layer', () => {
    const layer = {
      id: 'i1',
      kind: 'image' as const,
      assetId: 'asset_abc',
      x: 0.5,
      y: 0.5,
      rotation: 0,
      scale: 1,
      opacity: 1,
    };
    expect(ImageLayerSchema.parse(layer)).toEqual(layer);
  });
});

describe('LayerSchema discriminated union', () => {
  it('discriminates by kind', () => {
    const parsed = LayerSchema.parse({
      id: 't1',
      kind: 'text',
      text: 'hi',
      font: 'system-ui',
      color: '#fff',
      size: 0.4,
      x: 0.5,
      y: 0.5,
      rotation: 0,
      scale: 1,
      opacity: 1,
    });
    expect(parsed.kind).toBe('text');
  });

  it('rejects unknown kind', () => {
    expect(() =>
      LayerSchema.parse({ id: 'x', kind: 'sticker', x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 }),
    ).toThrow();
  });
});

describe('RecipeSchema', () => {
  it('accepts the empty recipe from createEmptyRecipe', () => {
    const recipe = createEmptyRecipe();
    expect(RecipeSchema.parse(recipe)).toEqual(recipe);
  });

  it('enforces the layer cap', () => {
    const tooMany: Recipe = {
      version: 1,
      size: 256,
      background: { kind: 'transparent' },
      shape: 'circle',
      shapeRotation: 0,
      layers: Array.from({ length: MAX_LAYERS + 1 }, (_, i) => ({
        id: `l${i}`,
        kind: 'icon' as const,
        iconset: 'lucide',
        name: 'star',
        color: { kind: 'solid' as const, color: '#fff' },
        x: 0.5,
        y: 0.5,
        rotation: 0,
        scale: 1,
        opacity: 1,
      })),
    };
    expect(() => RecipeSchema.parse(tooMany)).toThrow();
  });

  it('rejects version other than 1', () => {
    const bad = createEmptyRecipe() as Recipe & { version: number };
    bad.version = 2 as 1;
    expect(() => RecipeSchema.parse(bad)).toThrow();
  });
});

describe('createEmptyRecipe', () => {
  it('returns a parseable default recipe with size 256, solid bg, circle shape, no layers', () => {
    const r = createEmptyRecipe();
    expect(r.version).toBe(1);
    expect(r.size).toBe(DEFAULT_SIZE);
    expect(r.background.kind).toBe('solid');
    expect(r.shape).toBe('circle');
    expect(r.layers).toEqual([]);
  });
});
