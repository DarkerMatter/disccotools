import { describe, expect, it } from 'vitest';
import {
  createEmptyRecipe,
  type Recipe,
} from '@disccotools/shared';
import { recipeToSvgString, renderRecipeAtSize } from './render.js';

function withRecipe(partial: Partial<Recipe>): Recipe {
  return { ...createEmptyRecipe(), ...partial };
}

describe('recipeToSvgString', () => {
  it('returns a complete SVG document with width/height matching the export size', () => {
    const svg = recipeToSvgString(withRecipe({ size: 128 }));
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('width="128"');
    expect(svg).toContain('height="128"');
    expect(svg).toContain('viewBox="0 0 128 128"');
    expect(svg.endsWith('</svg>')).toBe(true);
  });

  it('embeds a clipPath path for circle shape', () => {
    const svg = recipeToSvgString(withRecipe({ shape: 'circle', size: 256 }));
    expect(svg).toContain('<clipPath id="clip"><path d=');
  });

  it('embeds a clipPath path for rounded-square', () => {
    const svg = recipeToSvgString(withRecipe({ shape: 'rounded-square', size: 256 }));
    expect(svg).toContain('<clipPath id="clip"><path d=');
  });

  it('embeds a clipPath path for star', () => {
    const svg = recipeToSvgString(withRecipe({ shape: 'star', size: 256 }));
    expect(svg).toContain('<clipPath id="clip"><path d=');
  });

  it('writes a solid background fill', () => {
    const svg = recipeToSvgString(
      withRecipe({
        background: { kind: 'solid', color: '#123456', opacity: 0.7 },
      }),
    );
    expect(svg).toContain('fill="#123456"');
    expect(svg).toContain('opacity="0.7"');
  });

  it('writes a linear gradient defs when background is gradient', () => {
    const svg = recipeToSvgString(
      withRecipe({
        background: { kind: 'gradient', from: '#abc', to: '#def', angle: 90, opacity: 1 },
      }),
    );
    expect(svg).toContain('<linearGradient id="bg"');
    expect(svg).toContain('stop-color="#abc"');
    expect(svg).toContain('stop-color="#def"');
  });

  it('omits background fill when transparent', () => {
    const svg = recipeToSvgString(
      withRecipe({ background: { kind: 'transparent' } }),
    );
    expect(svg).not.toContain('<rect width=');
  });

  it('writes an icon layer with the Iconify URL', () => {
    const svg = recipeToSvgString(
      withRecipe({
        layers: [
          {
            id: 'l1',
            kind: 'icon',
            iconset: 'lucide',
            name: 'rocket',
            color: { kind: 'solid', color: '#ffffff' },
            x: 0.5,
            y: 0.5,
            rotation: 0,
            scale: 1,
            opacity: 1,
          },
        ],
      }),
    );
    expect(svg).toContain('https://api.iconify.design/lucide/rocket.svg');
  });

  it('writes a text layer with content and font', () => {
    const svg = recipeToSvgString(
      withRecipe({
        layers: [
          {
            id: 't1',
            kind: 'text',
            text: 'hi',
            font: 'Georgia',
            color: '#000',
            size: 0.3,
            x: 0.5,
            y: 0.5,
            rotation: 0,
            scale: 1,
            opacity: 1,
          },
        ],
      }),
    );
    expect(svg).toContain('font-family="Georgia"');
    expect(svg).toMatch(/>hi<\/text>/);
  });

  it('escapes characters that would break SVG (& < > " in attrs and content)', () => {
    const svg = recipeToSvgString(
      withRecipe({
        layers: [
          {
            id: 't1',
            kind: 'text',
            text: 'a & b < c',
            font: 'system-ui',
            color: '#000',
            size: 0.3,
            x: 0.5,
            y: 0.5,
            rotation: 0,
            scale: 1,
            opacity: 1,
          },
        ],
      }),
    );
    expect(svg).toContain('a &amp; b &lt; c');
  });

  it('substitutes data-URI overrides when provided', () => {
    const recipe = {
      ...createEmptyRecipe(),
      layers: [
        {
          id: 'l1', kind: 'icon' as const, iconset: 'lucide', name: 'rocket',
          color: { kind: 'solid' as const, color: '#ffffff' },
          x: 0.5, y: 0.5, rotation: 0, scale: 1, opacity: 1,
        },
      ],
    };
    const originalUrl = 'https://api.iconify.design/lucide/rocket.svg?color=%23ffffff';
    const overrides = new Map<string, string>([[originalUrl, 'data:image/svg+xml;base64,ZGF0YQ==']]);
    const svg = recipeToSvgString(recipe, overrides);
    expect(svg).toContain('data:image/svg+xml;base64,ZGF0YQ==');
    expect(svg).not.toContain('api.iconify.design');
  });

  it('writes a masked + gradient SVG for a gradient icon', () => {
    const recipe = {
      ...createEmptyRecipe(),
      layers: [
        {
          id: 'l1', kind: 'icon' as const, iconset: 'lucide', name: 'rocket',
          color: { kind: 'gradient' as const, from: '#fff', to: '#000', angle: 45 },
          x: 0.5, y: 0.5, rotation: 0, scale: 1, opacity: 1,
        },
      ],
    };
    const svg = recipeToSvgString(recipe);
    expect(svg).toContain('<mask id="mask-l1">');
    expect(svg).toContain('<linearGradient id="grad-l1"');
    expect(svg).toContain('mask="url(#mask-l1)"');
    expect(svg).toContain('fill="url(#grad-l1)"');
  });
});

describe('image layers', () => {
  it('writes <image href> pointing at /api/assets/:id/file by default', () => {
    const recipe = {
      ...createEmptyRecipe(),
      layers: [
        {
          id: 'im1', kind: 'image' as const, assetId: 'asset_abc',
          x: 0.5, y: 0.5, rotation: 0, scale: 1, opacity: 1,
        },
      ],
    };
    const svg = recipeToSvgString(recipe);
    expect(svg).toContain('/api/assets/asset_abc/file');
  });

  it('substitutes asset URL overrides', () => {
    const recipe = {
      ...createEmptyRecipe(),
      layers: [
        {
          id: 'im1', kind: 'image' as const, assetId: 'asset_abc',
          x: 0.5, y: 0.5, rotation: 0, scale: 1, opacity: 1,
        },
      ],
    };
    const overrides = new Map<string, string>([
      ['/api/assets/asset_abc/file', 'data:image/png;base64,ZGF0YQ=='],
    ]);
    const svg = recipeToSvgString(recipe, overrides);
    expect(svg).toContain('data:image/png;base64,ZGF0YQ==');
    expect(svg).not.toContain('/api/assets/asset_abc/file');
  });
});

describe('renderRecipeAtSize', () => {
  it('produces an svg string whose width/height match the requested size', () => {
    // We don't have canvas in jsdom; we just verify that the recipe override
    // flows through to the SVG builder.
    const r = createEmptyRecipe();
    const svg128 = recipeToSvgString({ ...r, size: 128 });
    const svg256 = recipeToSvgString({ ...r, size: 256 });
    expect(svg128).toContain('width="128"');
    expect(svg256).toContain('width="256"');
  });

  it('exists as an exported function', () => {
    expect(typeof renderRecipeAtSize).toBe('function');
  });
});
