import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  globalName: z.string().nullable(),
  avatarHash: z.string().nullable(),
  isHomeMember: z.boolean(),
  memberCheckedAt: z.number().nullable(),
});
export type User = z.infer<typeof UserSchema>;

export const SessionClaimsSchema = z.object({
  sub: z.string(),
  username: z.string(),
  globalName: z.string().nullable(),
  avatarHash: z.string().nullable(),
  isHomeMember: z.boolean(),
  memberCheckedAt: z.number(),
  jti: z.string(),
  iat: z.number(),
  exp: z.number(),
});
export type SessionClaims = z.infer<typeof SessionClaimsSchema>;

export const AuthMeResponseSchema = z.object({
  user: UserSchema,
});
export type AuthMeResponse = z.infer<typeof AuthMeResponseSchema>;

export function userFromClaims(claims: SessionClaims): User {
  return {
    id: claims.sub,
    username: claims.username,
    globalName: claims.globalName,
    avatarHash: claims.avatarHash,
    isHomeMember: claims.isHomeMember,
    memberCheckedAt: claims.memberCheckedAt,
  };
}
