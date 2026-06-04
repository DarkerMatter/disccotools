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
    };
    expect(SaveSummarySchema.parse(ok)).toEqual(ok);
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
    };
    expect(AssetSchema.parse(ok)).toEqual(ok);
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
    };
    expect(AssetResponseSchema.parse({ asset })).toEqual({ asset });
  });
});

describe('RenameAssetBodySchema', () => {
  it('accepts a non-empty name', () => {
    expect(RenameAssetBodySchema.parse({ name: 'new' })).toEqual({ name: 'new' });
  });

  it('rejects empty name', () => {
    expect(() => RenameAssetBodySchema.parse({ name: '' })).toThrow();
  });

  it('rejects names over 120 chars', () => {
    expect(() => RenameAssetBodySchema.parse({ name: 'x'.repeat(121) })).toThrow();
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
