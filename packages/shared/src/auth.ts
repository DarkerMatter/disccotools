import { z } from 'zod';

/**
 * The shape of a user as exposed by the worker to clients.
 * Mirrors the D1 `users` row with camelCase for the JS side.
 */
export const UserSchema = z.object({
  id: z.string(),                                // Discord snowflake
  username: z.string(),
  globalName: z.string().nullable(),             // Discord global_name
  avatarHash: z.string().nullable(),             // Discord avatar hash
  isHomeMember: z.boolean(),
  memberCheckedAt: z.number().nullable(),        // unix ms; null if never checked
});
export type User = z.infer<typeof UserSchema>;

/**
 * Claims encoded into the session JWT.
 * Standard JWT fields (sub, iat, exp) plus a denormalized user snapshot
 * so /api/auth/me responses don't need a DB read per request.
 */
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

/**
 * Helper: convert SessionClaims to a User the API surface returns.
 * Used by both the SPA (to materialize cached state) and the worker
 * (to build /api/auth/me responses from session claims without a DB lookup).
 */
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
