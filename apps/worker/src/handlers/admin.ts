import type { Context } from 'hono';
import {
  AdminReasonBodySchema,
  AdminSetPermBodySchema,
  PERM_LEVEL,
  type AdminAssetRow,
  type AdminCustomIcon,
  type AdminSaveRow,
  type AdminUserDetailResponse,
  type AdminUserSummary,
  type AdminActionLog,
} from '@disccotools/shared';
import type { AppEnv } from '../env.js';
import {
  deleteUserRow,
  getUserWithPerm,
  listAllUsers,
  setUserPermLevel,
} from '../db/users.js';
import {
  countAssetsByUser,
  deleteAsset,
  getAsset,
  listAllAssets,
  listAssetsByUser,
} from '../db/assets.js';
import {
  deleteSave,
  getSave,
  listAllSaves,
  listSavesByUser,
  type Save,
} from '../db/saves.js';
import {
  acknowledgeNotice,
  createAdminAction,
  listActionsAgainstUser,
  type AdminAction,
} from '../db/adminActions.js';

const CUSTOM_PREFIX = 'static/icons/custom/';

function validation(c: Context<AppEnv>, message: string) {
  return c.json({ error: { code: 'VALIDATION', message } }, 400);
}

function notFound(c: Context<AppEnv>, message = 'not found') {
  return c.json({ error: { code: 'NOT_FOUND', message } }, 404);
}

async function safeJson(c: Context<AppEnv>): Promise<unknown | undefined> {
  try {
    return (await c.req.json()) as unknown;
  } catch {
    return undefined;
  }
}

function saveToRow(save: Save): AdminSaveRow {
  return {
    id: save.id,
    name: save.name,
    createdAt: save.createdAt,
    updatedAt: save.updatedAt,
    recipe: save.recipe,
    tags: save.tags,
    shareToken: save.shareToken,
    userId: save.userId,
  };
}

function actionToLog(action: AdminAction): AdminActionLog {
  return {
    id: action.id,
    adminId: action.adminId,
    targetUserId: action.targetUserId,
    action: action.action,
    targetId: action.targetId,
    targetLabel: action.targetLabel,
    reason: action.reason,
    createdAt: action.createdAt,
    acknowledgedAt: action.acknowledgedAt,
  };
}

export async function listAdminUsersHandler(
  c: Context<AppEnv>,
): Promise<Response> {
  const search = c.req.query('search')?.trim() || undefined;
  const users = await listAllUsers(c.env.DB, { search, limit: 200 });
  const out: AdminUserSummary[] = users.map((u) => ({
    id: u.id,
    username: u.username,
    globalName: u.globalName,
    avatarHash: u.avatarHash,
    permLevel: u.permLevel,
    savesCount: u.savesCount,
    assetsCount: u.assetsCount,
  }));
  return c.json({ users: out }, 200);
}

export async function getAdminUserHandler(
  c: Context<AppEnv>,
): Promise<Response> {
  const id = c.req.param('id');
  if (!id) return validation(c, 'missing id');
  const user = await getUserWithPerm(c.env.DB, id);
  if (!user) return notFound(c, 'user not found');

  const [assets, saves, actions, savesCount, assetsCount] = await Promise.all([
    listAssetsByUser(c.env.DB, id, { limit: 200 }),
    listSavesByUser(c.env.DB, id, { limit: 200 }),
    listActionsAgainstUser(c.env.DB, id),
    countSaves(c.env.DB, id),
    countAssetsByUser(c.env.DB, id),
  ]);

  const body: AdminUserDetailResponse = {
    user: {
      id: user.id,
      username: user.username,
      globalName: user.globalName,
      avatarHash: user.avatarHash,
      permLevel: user.permLevel,
      savesCount,
      assetsCount,
    },
    assets: assets.map((a) => ({
      id: a.id,
      name: a.name,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      url: `/api/assets/${a.id}/file`,
      tags: a.tags,
    })),
    saves: saves.map(saveToRow),
    actions: actions.map(actionToLog),
  };
  return c.json(body, 200);
}

async function countSaves(db: D1Database, userId: string): Promise<number> {
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM saves WHERE user_id = ?`)
    .bind(userId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function setAdminUserPermHandler(
  c: Context<AppEnv>,
): Promise<Response> {
  const admin = c.var.user!;
  const id = c.req.param('id');
  if (!id) return validation(c, 'missing id');
  const json = await safeJson(c);
  const parsed = AdminSetPermBodySchema.safeParse(json);
  if (!parsed.success) return validation(c, parsed.error.message);

  const target = await getUserWithPerm(c.env.DB, id);
  if (!target) return notFound(c, 'user not found');

  const before = target.permLevel;
  const after = parsed.data.level;
  if (before === after) {
    return c.json({ user: target }, 200);
  }

  const updated = await setUserPermLevel(c.env.DB, id, after);
  if (!updated) return notFound(c, 'user vanished');

  await createAdminAction(c.env.DB, {
    adminId: admin.id,
    targetUserId: id,
    action: after === PERM_LEVEL.BANNED ? 'banned' : 'level_changed',
    targetId: null,
    targetLabel: `${before} → ${after}`,
    reason: parsed.data.reason,
  });

  return c.json({ user: updated }, 200);
}

export async function deleteAdminAssetHandler(
  c: Context<AppEnv>,
): Promise<Response> {
  const admin = c.var.user!;
  const id = c.req.param('id');
  if (!id) return validation(c, 'missing id');
  const json = await safeJson(c);
  const parsed = AdminReasonBodySchema.safeParse(json);
  if (!parsed.success) return validation(c, parsed.error.message);

  const asset = await getAsset(c.env.DB, id);
  if (!asset) return notFound(c, 'asset not found');

  // r2 first, then d1, like the user-facing delete handler
  await c.env.R2.delete(asset.r2Key).catch(() => undefined);
  await deleteAsset(c.env.DB, id);

  await createAdminAction(c.env.DB, {
    adminId: admin.id,
    targetUserId: asset.userId,
    action: 'asset_deleted',
    targetId: asset.id,
    targetLabel: asset.name,
    reason: parsed.data.reason,
  });
  return c.body(null, 204);
}

export async function deleteAdminSaveHandler(
  c: Context<AppEnv>,
): Promise<Response> {
  const admin = c.var.user!;
  const id = c.req.param('id');
  if (!id) return validation(c, 'missing id');
  const json = await safeJson(c);
  const parsed = AdminReasonBodySchema.safeParse(json);
  if (!parsed.success) return validation(c, parsed.error.message);

  const save = await getSave(c.env.DB, id);
  if (!save) return notFound(c, 'save not found');

  await deleteSave(c.env.DB, id);

  await createAdminAction(c.env.DB, {
    adminId: admin.id,
    targetUserId: save.userId,
    action: 'save_deleted',
    targetId: save.id,
    targetLabel: save.name,
    reason: parsed.data.reason,
  });
  return c.body(null, 204);
}

export async function deleteAdminUserHandler(
  c: Context<AppEnv>,
): Promise<Response> {
  const admin = c.var.user!;
  const id = c.req.param('id');
  if (!id) return validation(c, 'missing id');
  if (id === admin.id) {
    return c.json(
      { error: { code: 'FORBIDDEN', message: "can't delete yourself" } },
      403,
    );
  }
  const json = await safeJson(c);
  const parsed = AdminReasonBodySchema.safeParse(json);
  if (!parsed.success) return validation(c, parsed.error.message);

  const target = await getUserWithPerm(c.env.DB, id);
  if (!target) return notFound(c, 'user not found');

  // r2 cleanup before d1 so we don't strand objects.
  // assets first because saves reference them.
  const assets = await listAssetsByUser(c.env.DB, id, { limit: 500 });
  for (const a of assets) {
    await c.env.R2.delete(a.r2Key).catch(() => undefined);
  }

  // d1 deletes: assets, saves, then user. no FKs in the schema so order
  // is only about how we want partial-failure to look.
  await c.env.DB.prepare(`DELETE FROM assets WHERE user_id = ?`).bind(id).run();
  await c.env.DB.prepare(`DELETE FROM saves WHERE user_id = ?`).bind(id).run();
  await deleteUserRow(c.env.DB, id);

  // log the action against the (now deleted) user so anyone investigating
  // can still trace it. notices for a deleted user are unreachable, but
  // keeping the row is the right call for audit purposes.
  await createAdminAction(c.env.DB, {
    adminId: admin.id,
    targetUserId: id,
    action: 'account_deleted',
    targetId: null,
    targetLabel: target.username,
    reason: parsed.data.reason,
  });

  return c.body(null, 204);
}

export async function listAdminAssetsHandler(
  c: Context<AppEnv>,
): Promise<Response> {
  const userId = c.req.query('userId') || undefined;
  const assets = await listAllAssets(c.env.DB, { userId, limit: 200 });
  const out: AdminAssetRow[] = assets.map((a) => ({
    id: a.id,
    name: a.name,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    url: `/api/assets/${a.id}/file`,
    tags: a.tags,
    userId: a.userId,
  }));
  return c.json({ assets: out }, 200);
}

export async function listAdminSavesHandler(
  c: Context<AppEnv>,
): Promise<Response> {
  const userId = c.req.query('userId') || undefined;
  const saves = await listAllSaves(c.env.DB, { userId, limit: 200 });
  return c.json({ saves: saves.map(saveToRow) }, 200);
}

export async function listAdminCustomIconsHandler(
  c: Context<AppEnv>,
): Promise<Response> {
  const icons: AdminCustomIcon[] = [];
  let cursor: string | undefined;
  do {
    const res: R2Objects = await c.env.R2.list({
      prefix: CUSTOM_PREFIX,
      limit: 1000,
      ...(cursor ? { cursor } : {}),
    });
    for (const obj of res.objects) {
      const rest = obj.key.slice(CUSTOM_PREFIX.length);
      const parts = rest.split('/');
      if (parts.length !== 2) continue;
      const [category, filename] = parts;
      if (!filename.toLowerCase().endsWith('.svg')) continue;
      const basename = filename.slice(0, -'.svg'.length);
      icons.push({
        key: obj.key,
        category,
        basename,
        sizeBytes: obj.size,
        uploadedAt: obj.uploaded.getTime(),
      });
    }
    cursor = res.truncated ? res.cursor : undefined;
  } while (cursor);
  return c.json({ icons }, 200);
}

export async function deleteAdminCustomIconHandler(
  c: Context<AppEnv>,
): Promise<Response> {
  const raw = c.req.query('key');
  if (!raw) return validation(c, 'missing key query');
  if (!raw.startsWith(CUSTOM_PREFIX)) {
    return validation(c, 'key must be under the custom prefix');
  }
  await c.env.R2.delete(raw).catch(() => undefined);
  return c.body(null, 204);
}

export async function ackNoticeHandler(c: Context<AppEnv>): Promise<Response> {
  const user = c.var.user!;
  const id = c.req.param('id');
  if (!id) return validation(c, 'missing id');
  const ok = await acknowledgeNotice(c.env.DB, id, user.id);
  if (!ok) return notFound(c, 'notice not found or already acknowledged');
  return c.body(null, 204);
}
