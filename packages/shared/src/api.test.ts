import { describe, expect, it } from 'vitest';
import { createEmptyRecipe } from './recipe.js';
import {
  AssetInUseResponseSchema,
  AssetResponseSchema,
  AssetSchema,
  CreateSaveBodySchema,
  ListAssetsResponseSchema,
  ListSavesResponseSchema,
  RenameAssetBodySchema,
  SaveDetailSchema,
  SaveFilterSchema,
  SaveSummarySchema,
  TagsSchema,
  UpdateAssetBodySchema,
  UpdateSaveBodySchema,
} from './api.js';

describe('SaveSummarySchema', () => {
  it('accepts a populated summary with null thumbnailUrl', () => {
    const ok = {
      id: 'sv_1',
      name: 'design',
      isTemplate: false,
      createdAt: 1,
      updatedAt: 1,
      thumbnailUrl: null,
      tags: [],
    };
    expect(SaveSummarySchema.parse(ok)).toEqual(ok);
  });

  it('accepts populated tags', () => {
    const ok = {
      id: 'sv_1',
      name: 'design',
      isTemplate: false,
      createdAt: 1,
      updatedAt: 1,
      thumbnailUrl: null,
      tags: ['icon', 'brand'],
    };
    expect(SaveSummarySchema.parse(ok).tags).toEqual(['icon', 'brand']);
  });
});

describe('SaveDetailSchema', () => {
  it('accepts a save detail including a parsed recipe', () => {
    const ok = {
      id: 'sv_1',
      name: 'design',
      recipe: createEmptyRecipe(),
      isTemplate: false,
      renderedAt: null,
      createdAt: 1,
      updatedAt: 1,
      thumbnailUrl: null,
      downloadUrl: null,
      tags: [],
    };
    expect(SaveDetailSchema.parse(ok)).toEqual(ok);
  });
});

describe('SaveFilterSchema', () => {
  it.each(['all', 'designs', 'templates'] as const)('accepts %s', (f) => {
    expect(SaveFilterSchema.parse(f)).toBe(f);
  });

  it('rejects others', () => {
    expect(() => SaveFilterSchema.parse('archived')).toThrow();
  });
});

describe('ListSavesResponseSchema', () => {
  it('wraps an array', () => {
    expect(ListSavesResponseSchema.parse({ saves: [] })).toEqual({ saves: [] });
  });
});

describe('CreateSaveBodySchema', () => {
  it('accepts name + recipe', () => {
    const body = { name: 'first', recipe: createEmptyRecipe() };
    expect(CreateSaveBodySchema.parse(body)).toEqual(body);
  });

  it('rejects empty name', () => {
    expect(() =>
      CreateSaveBodySchema.parse({ name: '', recipe: createEmptyRecipe() }),
    ).toThrow();
  });
});

describe('UpdateSaveBodySchema', () => {
  it('accepts empty patch', () => {
    expect(UpdateSaveBodySchema.parse({})).toEqual({});
  });

  it('accepts a name-only patch', () => {
    expect(UpdateSaveBodySchema.parse({ name: 'new' })).toEqual({ name: 'new' });
  });

  it('accepts a tags-only patch', () => {
    expect(UpdateSaveBodySchema.parse({ tags: ['a', 'b'] })).toEqual({
      tags: ['a', 'b'],
    });
  });
});

describe('TagsSchema', () => {
  it('accepts an empty array', () => {
    expect(TagsSchema.parse([])).toEqual([]);
  });

  it('accepts up to 8 short tags', () => {
    const tags = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    expect(TagsSchema.parse(tags)).toEqual(tags);
  });

  it('rejects more than 8 tags', () => {
    expect(() =>
      TagsSchema.parse(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']),
    ).toThrow();
  });

  it('rejects a tag longer than 24 chars', () => {
    expect(() => TagsSchema.parse(['x'.repeat(25)])).toThrow();
  });

  it('rejects an empty tag string', () => {
    expect(() => TagsSchema.parse([''])).toThrow();
  });
});

describe('AssetSchema', () => {
  it('accepts a populated asset', () => {
    const ok = {
      id: 'a_1',
      name: 'logo',
      mimeType: 'image/png',
      sizeBytes: 1024,
      createdAt: 1,
      updatedAt: 1,
      url: '/api/assets/a_1/file',
      tags: [],
    };
    expect(AssetSchema.parse(ok)).toEqual(ok);
  });

  it('accepts populated tags', () => {
    const ok = {
      id: 'a_1',
      name: 'logo',
      mimeType: 'image/png',
      sizeBytes: 1024,
      createdAt: 1,
      updatedAt: 1,
      url: '/api/assets/a_1/file',
      tags: ['brand', 'logo'],
    };
    expect(AssetSchema.parse(ok).tags).toEqual(['brand', 'logo']);
  });
});

describe('ListAssetsResponseSchema', () => {
  it('wraps an array of assets', () => {
    expect(ListAssetsResponseSchema.parse({ assets: [] })).toEqual({ assets: [] });
  });
});

describe('AssetResponseSchema', () => {
  it('wraps a single asset', () => {
    const asset = {
      id: 'a_1',
      name: 'logo',
      mimeType: 'image/svg+xml',
      sizeBytes: 100,
      createdAt: 1,
      updatedAt: 1,
      url: '/api/assets/a_1/file',
      tags: [],
    };
    expect(AssetResponseSchema.parse({ asset })).toEqual({ asset });
  });
});

describe('RenameAssetBodySchema (alias for UpdateAssetBodySchema)', () => {
  it('accepts a non-empty name', () => {
    expect(RenameAssetBodySchema.parse({ name: 'new' })).toEqual({ name: 'new' });
  });

  it('rejects empty name', () => {
    expect(() => RenameAssetBodySchema.parse({ name: '' })).toThrow();
  });

  it('rejects names over 120 chars', () => {
    expect(() => RenameAssetBodySchema.parse({ name: 'x'.repeat(121) })).toThrow();
  });

  it('accepts an empty patch (no name, no tags)', () => {
    expect(RenameAssetBodySchema.parse({})).toEqual({});
  });
});

describe('UpdateAssetBodySchema', () => {
  it('accepts a name-only patch', () => {
    expect(UpdateAssetBodySchema.parse({ name: 'fresh' })).toEqual({ name: 'fresh' });
  });

  it('accepts a tags-only patch', () => {
    expect(UpdateAssetBodySchema.parse({ tags: ['icon'] })).toEqual({ tags: ['icon'] });
  });

  it('accepts both name and tags', () => {
    expect(UpdateAssetBodySchema.parse({ name: 'x', tags: ['a'] })).toEqual({
      name: 'x',
      tags: ['a'],
    });
  });

  it('rejects tags exceeding the cap', () => {
    expect(() =>
      UpdateAssetBodySchema.parse({ tags: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'] }),
    ).toThrow();
  });
});

describe('AssetInUseResponseSchema', () => {
  it('accepts a 409 payload with references', () => {
    const ok = {
      error: {
        code: 'CONFLICT' as const,
        message: 'asset is in use',
        references: [{ id: 'sv_1', name: 'design' }],
      },
    };
    expect(AssetInUseResponseSchema.parse(ok)).toEqual(ok);
  });
});
