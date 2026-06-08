import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createEmptyRecipe } from '@disccotools/shared';
import {
  createAsset,
  deleteAsset,
  findSavesReferencingAsset,
  getAsset,
  listAssetsByUser,
  updateAsset,
} from './assets.js';

const USER_ID = 'u_test_1';
const OTHER_USER_ID = 'u_test_2';

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM assets'),
    env.DB.prepare('DELETE FROM saves'),
    env.DB.prepare('DELETE FROM users'),
    env.DB.prepare(
      'INSERT INTO users (id, username, created_at, updated_at) VALUES (?, ?, ?, ?)',
    ).bind(USER_ID, 'test', now, now),
    env.DB.prepare(
      'INSERT INTO users (id, username, created_at, updated_at) VALUES (?, ?, ?, ?)',
    ).bind(OTHER_USER_ID, 'other', now, now),
  ]);
});

describe('createAsset + getAsset', () => {
  it('round-trips a row', async () => {
    const created = await createAsset(env.DB, {
      userId: USER_ID,
      name: 'logo.png',
      r2Key: `assets/${USER_ID}/abc.png`,
      mimeType: 'image/png',
      sizeBytes: 1024,
    });
    expect(created.userId).toBe(USER_ID);
    expect(created.name).toBe('logo.png');
    expect(created.r2Key).toBe(`assets/${USER_ID}/abc.png`);
    expect(created.mimeType).toBe('image/png');
    expect(created.sizeBytes).toBe(1024);
    expect(created.id).toBeTruthy();

    const fetched = await getAsset(env.DB, created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(created.id);
    expect(fetched!.r2Key).toBe(created.r2Key);
  });

  it('returns null for missing id', async () => {
    expect(await getAsset(env.DB, 'nope')).toBeNull();
  });
});

describe('listAssetsByUser', () => {
  beforeEach(async () => {
    await createAsset(env.DB, {
      userId: USER_ID,
      name: 'a',
      r2Key: `assets/${USER_ID}/a.png`,
      mimeType: 'image/png',
      sizeBytes: 100,
    });
    await createAsset(env.DB, {
      userId: USER_ID,
      name: 'b',
      r2Key: `assets/${USER_ID}/b.svg`,
      mimeType: 'image/svg+xml',
      sizeBytes: 200,
    });
    await createAsset(env.DB, {
      userId: OTHER_USER_ID,
      name: 'x',
      r2Key: `assets/${OTHER_USER_ID}/x.png`,
      mimeType: 'image/png',
      sizeBytes: 300,
    });
  });

  it('returns only this user’s assets', async () => {
    const list = await listAssetsByUser(env.DB, USER_ID);
    expect(list).toHaveLength(2);
    for (const a of list) expect(a.userId).toBe(USER_ID);
  });

  it('respects limit', async () => {
    const list = await listAssetsByUser(env.DB, USER_ID, { limit: 1 });
    expect(list).toHaveLength(1);
  });
});

describe('updateAsset', () => {
  it('renames the asset and bumps updated_at', async () => {
    const created = await createAsset(env.DB, {
      userId: USER_ID,
      name: 'old',
      r2Key: `assets/${USER_ID}/a.png`,
      mimeType: 'image/png',
      sizeBytes: 1,
    });
    const updated = await updateAsset(env.DB, created.id, { name: 'new' });
    expect(updated).not.toBeNull();
    expect(updated!.name).toBe('new');
    expect(updated!.updatedAt).toBeGreaterThanOrEqual(created.updatedAt);
  });

  it('returns the row unchanged when patch is empty', async () => {
    const created = await createAsset(env.DB, {
      userId: USER_ID,
      name: 'x',
      r2Key: `assets/${USER_ID}/x.png`,
      mimeType: 'image/png',
      sizeBytes: 1,
    });
    const same = await updateAsset(env.DB, created.id, {});
    expect(same!.id).toBe(created.id);
    expect(same!.name).toBe('x');
  });

  it('returns null for missing id', async () => {
    expect(await updateAsset(env.DB, 'nope', { name: 'x' })).toBeNull();
  });
});

describe('asset tags', () => {
  it('defaults to an empty array on insert', async () => {
    const created = await createAsset(env.DB, {
      userId: USER_ID,
      name: 't1',
      r2Key: `assets/${USER_ID}/t1.png`,
      mimeType: 'image/png',
      sizeBytes: 1,
    });
    expect(created.tags).toEqual([]);
    const fetched = await getAsset(env.DB, created.id);
    expect(fetched!.tags).toEqual([]);
  });

  it('round-trips a list of tags on create', async () => {
    const created = await createAsset(env.DB, {
      userId: USER_ID,
      name: 't2',
      r2Key: `assets/${USER_ID}/t2.png`,
      mimeType: 'image/png',
      sizeBytes: 1,
      tags: ['logo', 'brand'],
    });
    expect(created.tags).toEqual(['logo', 'brand']);
    const fetched = await getAsset(env.DB, created.id);
    expect(fetched!.tags).toEqual(['logo', 'brand']);
  });

  it('normalizes tags: lowercase, dedupe, cap', async () => {
    const created = await createAsset(env.DB, {
      userId: USER_ID,
      name: 't3',
      r2Key: `assets/${USER_ID}/t3.png`,
      mimeType: 'image/png',
      sizeBytes: 1,
      tags: ['Logo', ' logo ', 'BRAND'],
    });
    expect(created.tags).toEqual(['logo', 'brand']);
  });

  it('updates tags via updateAsset', async () => {
    const created = await createAsset(env.DB, {
      userId: USER_ID,
      name: 't4',
      r2Key: `assets/${USER_ID}/t4.png`,
      mimeType: 'image/png',
      sizeBytes: 1,
      tags: ['old'],
    });
    const updated = await updateAsset(env.DB, created.id, { tags: ['fresh'] });
    expect(updated!.tags).toEqual(['fresh']);
  });
});

describe('deleteAsset', () => {
  it('removes the row', async () => {
    const created = await createAsset(env.DB, {
      userId: USER_ID,
      name: 'x',
      r2Key: `assets/${USER_ID}/x.png`,
      mimeType: 'image/png',
      sizeBytes: 1,
    });
    await deleteAsset(env.DB, created.id);
    expect(await getAsset(env.DB, created.id)).toBeNull();
  });

  it('cascades when the user is deleted', async () => {
    const created = await createAsset(env.DB, {
      userId: USER_ID,
      name: 'x',
      r2Key: `assets/${USER_ID}/x.png`,
      mimeType: 'image/png',
      sizeBytes: 1,
    });
    await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(USER_ID).run();
    expect(await getAsset(env.DB, created.id)).toBeNull();
  });
});

describe('findSavesReferencingAsset', () => {
  it('returns saves whose recipe_json references the asset id', async () => {
    const asset = await createAsset(env.DB, {
      userId: USER_ID,
      name: 'logo',
      r2Key: `assets/${USER_ID}/logo.png`,
      mimeType: 'image/png',
      sizeBytes: 1,
    });
    const recipe = {
      ...createEmptyRecipe(),
      layers: [
        {
          id: 'l1',
          kind: 'image' as const,
          assetId: asset.id,
          x: 0.5,
          y: 0.5,
          rotation: 0,
          scale: 1,
          opacity: 1,
        },
      ],
    };
    const now = Date.now();
    await env.DB
      .prepare(
        `INSERT INTO saves (id, user_id, name, recipe_json, is_template, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, ?, ?)`,
      )
      .bind('sv_user_one', USER_ID, 'using asset', JSON.stringify(recipe), now, now)
      .run();
    // An unrelated save without the asset id.
    await env.DB
      .prepare(
        `INSERT INTO saves (id, user_id, name, recipe_json, is_template, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, ?, ?)`,
      )
      .bind('sv_user_two', USER_ID, 'unrelated', JSON.stringify(createEmptyRecipe()), now, now)
      .run();
    // Another user's save that references the same id — should not be returned.
    await env.DB
      .prepare(
        `INSERT INTO saves (id, user_id, name, recipe_json, is_template, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, ?, ?)`,
      )
      .bind('sv_other', OTHER_USER_ID, 'other', JSON.stringify(recipe), now, now)
      .run();

    const refs = await findSavesReferencingAsset(env.DB, USER_ID, asset.id);
    expect(refs).toHaveLength(1);
    expect(refs[0]!.id).toBe('sv_user_one');
    expect(refs[0]!.name).toBe('using asset');
  });

  it('returns an empty list when no saves reference the asset', async () => {
    const asset = await createAsset(env.DB, {
      userId: USER_ID,
      name: 'logo',
      r2Key: `assets/${USER_ID}/logo.png`,
      mimeType: 'image/png',
      sizeBytes: 1,
    });
    const now = Date.now();
    await env.DB
      .prepare(
        `INSERT INTO saves (id, user_id, name, recipe_json, is_template, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, ?, ?)`,
      )
      .bind('sv1', USER_ID, 'empty', JSON.stringify(createEmptyRecipe()), now, now)
      .run();
    const refs = await findSavesReferencingAsset(env.DB, USER_ID, asset.id);
    expect(refs).toEqual([]);
  });
});
