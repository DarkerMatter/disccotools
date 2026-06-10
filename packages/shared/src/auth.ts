import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  globalName: z.string().nullable(),
  avatarHash: z.string().nullable(),
});
export type User = z.infer<typeof UserSchema>;

export const PERM_LEVEL = {
  BANNED: 0,
  BASIC: 1,
  PLUS: 2,
  UNLIMITED: 3,
  ADMIN: 10,
} as const;

// null means no cap; banned can't upload anything anyway
export const UPLOAD_CAP_BY_LEVEL: Record<number, number | null> = {
  0: 0,
  1: 5,
  2: 10,
  3: null,
  10: null,
};

export function uploadCapForLevel(level: number): number | null {
  if (level >= PERM_LEVEL.UNLIMITED) return null;
  return UPLOAD_CAP_BY_LEVEL[level] ?? 0;
}

export const SessionClaimsSchema = z.object({
  sub: z.string(),
  username: z.string(),
  globalName: z.string().nullable(),
  avatarHash: z.string().nullable(),
  jti: z.string(),
  iat: z.number(),
  exp: z.number(),
});
export type SessionClaims = z.infer<typeof SessionClaimsSchema>;

// admin actions surfaced to the affected user so they know why their stuff disappeared
export const NoticeKindSchema = z.enum([
  'asset_deleted',
  'save_deleted',
  'account_deleted',
  'banned',
  'level_changed',
]);
export type NoticeKind = z.infer<typeof NoticeKindSchema>;

export const PendingNoticeSchema = z.object({
  id: z.string(),
  kind: NoticeKindSchema,
  reason: z.string(),
  targetLabel: z.string().nullable(),
  createdAt: z.number(),
});
export type PendingNotice = z.infer<typeof PendingNoticeSchema>;

export const AuthMeResponseSchema = z.object({
  user: UserSchema,
  permLevel: z.number().int(),
  pendingNotices: z.array(PendingNoticeSchema),
});
export type AuthMeResponse = z.infer<typeof AuthMeResponseSchema>;

export const AuthBannedResponseSchema = z.object({
  banned: z.literal(true),
  reason: z.string(),
});
export type AuthBannedResponse = z.infer<typeof AuthBannedResponseSchema>;

export function userFromClaims(claims: SessionClaims): User {
  return {
    id: claims.sub,
    username: claims.username,
    globalName: claims.globalName,
    avatarHash: claims.avatarHash,
  };
}
