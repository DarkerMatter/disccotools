import { describe, expect, it } from 'vitest';
import {
  AuthMeResponseSchema,
  SessionClaimsSchema,
  UserSchema,
  userFromClaims,
  type SessionClaims,
  type User,
} from './auth.js';

describe('UserSchema', () => {
  it('accepts a full user', () => {
    const user: User = {
      id: '714517219026927767',
      username: 'mitri',
      globalName: 'Dimitri',
      avatarHash: 'a_abc123',
      isHomeMember: true,
      memberCheckedAt: 1717000000000,
    };
    expect(UserSchema.parse(user)).toEqual(user);
  });

  it('accepts null globalName, avatarHash, and memberCheckedAt', () => {
    const user: User = {
      id: '123',
      username: 'anon',
      globalName: null,
      avatarHash: null,
      isHomeMember: false,
      memberCheckedAt: null,
    };
    expect(UserSchema.parse(user)).toEqual(user);
  });

  it('rejects a missing isHomeMember', () => {
    expect(() => UserSchema.parse({ id: '1', username: 'a' })).toThrow();
  });
});

describe('SessionClaimsSchema', () => {
  it('accepts a full session claim payload', () => {
    const claims: SessionClaims = {
      sub: '714517219026927767',
      username: 'mitri',
      globalName: 'Dimitri',
      avatarHash: 'a_abc123',
      isHomeMember: true,
      memberCheckedAt: 1717000000000,
      jti: 'test-jti-full',
      iat: 1717000000,
      exp: 1717604800,
    };
    expect(SessionClaimsSchema.parse(claims)).toEqual(claims);
  });

  it('rejects expired-looking claims if exp is missing', () => {
    expect(() =>
      SessionClaimsSchema.parse({
        sub: '1', username: 'a', globalName: null, avatarHash: null,
        isHomeMember: false, memberCheckedAt: 0, jti: 'j', iat: 1,
      }),
    ).toThrow();
  });

  it('rejects when jti is missing', () => {
    expect(() =>
      SessionClaimsSchema.parse({
        sub: '1', username: 'a', globalName: null, avatarHash: null,
        isHomeMember: false, memberCheckedAt: 0, iat: 1, exp: 2,
      }),
    ).toThrow();
  });
});

describe('userFromClaims', () => {
  it('drops JWT bookkeeping fields', () => {
    const claims: SessionClaims = {
      sub: '714517219026927767',
      username: 'mitri',
      globalName: 'Dimitri',
      avatarHash: 'a_abc123',
      isHomeMember: true,
      memberCheckedAt: 1717000000000,
      jti: 'test-jti-drop',
      iat: 1717000000,
      exp: 1717604800,
    };
    const user = userFromClaims(claims);
    expect(user).toEqual({
      id: '714517219026927767',
      username: 'mitri',
      globalName: 'Dimitri',
      avatarHash: 'a_abc123',
      isHomeMember: true,
      memberCheckedAt: 1717000000000,
    });
    expect(UserSchema.parse(user)).toEqual(user);
  });
});

describe('AuthMeResponseSchema', () => {
  it('wraps a user', () => {
    const body = {
      user: {
        id: '1', username: 'a', globalName: null, avatarHash: null,
        isHomeMember: false, memberCheckedAt: null,
      },
    };
    expect(AuthMeResponseSchema.parse(body)).toEqual(body);
  });
});
