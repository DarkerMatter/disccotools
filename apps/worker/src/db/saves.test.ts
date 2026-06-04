import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createEmptyRecipe } from '@disccotools/shared';
import {
  cloneSave,
  createSave,
  deleteSave,
  getSave,
  listSavesByUser,
  setSaveRender,
  updateSave,
} from './saves.js';

const USER_ID = 'u_test_1';
const OTHER_USER_ID = 'u_test_2';

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  // Seed the two test users (saves has an FK on users).
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM saves'),
    env.DB.prepare('DELETE FROM users'),
    env.DB.prepare(
      'INSERT INTO users (id, username, is_home_member, created_at, updated_at) VALUES (?, ?, 1, ?, ?)',
    ).bind(USER_ID, 'test', now, now),
    env.DB.prepare(
      'INSERT INTO users (id, username, is_home_member, created_at, updated_at) VALUES (?, ?, 0, ?, ?)',
    ).bind(OTHER_USER_ID, 'other', now, now),
  ]);
});

describe('createSave + getSave', () => {
  it('round-trips a save row including the recipe', async () => {
    const recipe = createEmptyRecipe();
    const created = await createSave(env.DB, {
      userId: USER_ID,
      name: 'first',
      recipe,
    });
    expect(created.userId).toBe(USER_ID);
    expect(created.name).toBe('first');
    expect(created.isTemplate).toBe(false);
    expect(created.recipe).toEqual(recipe);

    const fetched = await getSave(env.DB, created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(created.id);
    expect(fetched!.recipe).toEqual(recipe);
  });

  it('returns null for a missing id', async () => {
    expect(await getSave(env.DB, 'nope')).toBeNull();
  });
});

describe('listSavesByUser', () => {
  beforeEach(async () => {
    const recipe = createEmptyRecipe();
    await createSave(env.DB, { userId: USER_ID, name: 'a', recipe });
    await createSave(env.DB, { userId: USER_ID, name: 'b', recipe, isTemplate: true });
    await createSave(env.DB, { userId: USER_ID, name: 'c', recipe });
    await createSave(env.DB, { userId: OTHER_USER_ID, name: 'x', recipe });
  });

  it('lists only this user’s saves', async () => {
    const list = await listSavesByUser(env.DB, USER_ID);
    expect(list).toHaveLength(3);
    for (const s of list) expect(s.userId).toBe(USER_ID);
  });

  it('filters to designs only when requested', async () => {
    const list = await listSavesByUser(env.DB, USER_ID, { filter: 'designs' });
    expect(list).toHaveLength(2);
    for (const s of list) expect(s.isTemplate).toBe(false);
  });

  it('filters to templates only when requested', async () => {
    const list = await listSavesByUser(env.DB, USER_ID, { filter: 'templates' });
    expect(list).toHaveLength(1);
    expect(list[0]!.name).toBe('b');
  });

  it('respects limit', async () => {
    const list = await listSavesByUser(env.DB, USER_ID, { limit: 1 });
    expect(list).toHaveLength(1);
  });
});

describe('updateSave', () => {
  it('patches name + recipe + isTemplate', async () => {
    const created = await createSave(env.DB, {
      userId: USER_ID,
      name: 'old',
      recipe: createEmptyRecipe(),
    });
    const newRecipe = { ...createEmptyRecipe(), shape: 'square' as const };
    const updated = await updateSave(env.DB, created.id, {
      name: 'new',
      recipe: newRecipe,
      isTemplate: true,
    });
    expect(updated).not.toBeNull();
    expect(updated!.name).toBe('new');
    expect(updated!.recipe.shape).toBe('square');
    expect(updated!.isTemplate).toBe(true);
    expect(updated!.updatedAt).toBeGreaterThanOrEqual(created.updatedAt);
  });

  it('returns the existing save when patch is empty', async () => {
    const created = await createSave(env.DB, {
      userId: USER_ID,
      name: 'x',
      recipe: createEmptyRecipe(),
    });
    const same = await updateSave(env.DB, created.id, {});
    expect(same!.id).toBe(created.id);
    expect(same!.name).toBe('x');
  });
});

describe('setSaveRender', () => {
  it('writes rendered_key, thumb_key, rendered_format, rendered_at', async () => {
    const created = await createSave(env.DB, {
      userId: USER_ID,
      name: 'x',
      recipe: createEmptyRecipe(),
    });
    await setSaveRender(env.DB, created.id, {
      renderedKey: `saves/${USER_ID}/${created.id}.png`,
      thumbKey: `saves/${USER_ID}/${created.id}_thumb.png`,
      renderedFormat: 'png',
    });
    const fetched = await getSave(env.DB, created.id);
    expect(fetched!.renderedKey).toBe(`saves/${USER_ID}/${created.id}.png`);
    expect(fetched!.thumbKey).toBe(`saves/${USER_ID}/${created.id}_thumb.png`);
    expect(fetched!.renderedFormat).toBe('png');
    expect(fetched!.renderedAt).toBeGreaterThan(0);
  });
});

describe('cloneSave', () => {
  it('duplicates a save into a new id with `(copy)` suffix and is_template=false', async () => {
    const recipe = { ...createEmptyRecipe(), shape: 'square' as const };
    const source = await createSave(env.DB, {
      userId: USER_ID,
      name: 'tpl',
      recipe,
      isTemplate: true,
    });
    const cloned = await cloneSave(env.DB, source.id);
    expect(cloned).not.toBeNull();
    expect(cloned!.id).not.toBe(source.id);
    expect(cloned!.name).toBe('tpl (copy)');
    expect(cloned!.isTemplate).toBe(false);
    expect(cloned!.recipe).toEqual(recipe);
  });

  it('honors a custom new name', async () => {
    const source = await createSave(env.DB, {
      userId: USER_ID,
      name: 'a',
      recipe: createEmptyRecipe(),
    });
    const cloned = await cloneSave(env.DB, source.id, { newName: 'b' });
    expect(cloned!.name).toBe('b');
  });

  it('returns null for missing source', async () => {
    expect(await cloneSave(env.DB, 'nope')).toBeNull();
  });
});

describe('deleteSave', () => {
  it('removes the row', async () => {
    const created = await createSave(env.DB, {
      userId: USER_ID,
      name: 'x',
      recipe: createEmptyRecipe(),
    });
    await deleteSave(env.DB, created.id);
    expect(await getSave(env.DB, created.id)).toBeNull();
  });

  it('cascades when the user is deleted', async () => {
    const created = await createSave(env.DB, {
      userId: USER_ID,
      name: 'x',
      recipe: createEmptyRecipe(),
    });
    await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(USER_ID).run();
    expect(await getSave(env.DB, created.id)).toBeNull();
  });
});
