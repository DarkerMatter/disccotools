import { z } from 'zod';

/** User shape sent to clients; camelCase mirror of the D1 `users` row. */
export const UserSchema = z.object({
  id: z.string(),                                // Discord snowflake
  username: z.string(),
  globalName: z.string().nullable(),             // Discord global_name
  avatarHash: z.string().nullable(),             // Discord avatar hash
  isHomeMember: z.boolean(),
  memberCheckedAt: z.number().nullable(),        // unix ms; null if never checked
});
export type User = z.infer<typeof UserSchema>;

/** Session JWT claims. Includes a denormalized user snapshot to skip DB reads. */
export const SessionClaimsSchema = z.object({
  sub: z.string(),                               // Discord user id
  username: z.string(),
  globalName: z.string().nullable(),
  avatarHash: z.string().nullable(),
  isHomeMember: z.boolean(),
  memberCheckedAt: z.number(),                   // unix ms
  jti: z.string(),                               // unique JWT id (for denylist revocation)
  iat: z.number(),                               // unix seconds (standard JWT)
  exp: z.number(),                               // unix seconds (standard JWT)
});
export type SessionClaims = z.infer<typeof SessionClaimsSchema>;

/** Response body of GET /api/auth/me when authenticated. */
export const AuthMeResponseSchema = z.object({
  user: UserSchema,
});
export type AuthMeResponse = z.infer<typeof AuthMeResponseSchema>;

/** Convert SessionClaims to the User shape the API surface returns. */
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
