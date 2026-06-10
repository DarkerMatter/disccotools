import {
  AuthBannedResponseSchema,
  AuthMeResponseSchema,
  type AuthBannedResponse,
  type AuthMeResponse,
} from '@disccotools/shared';

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const res = await fetch(path, init);
  if (res.status === 401) {
    window.location.assign('/api/auth/login');
    throw new ApiError('UNAUTHORIZED', 401, 'redirecting to login');
  }
  if (!res.ok) throw await readError(res);
  return res;
}

async function readError(res: Response): Promise<ApiError> {
  let code = 'UNKNOWN';
  let message = `HTTP ${res.status}`;
  try {
    const body = (await res.json()) as {
      error?: { code?: string; message?: string };
    };
    if (body.error?.code) code = body.error.code;
    if (body.error?.message) message = body.error.message;
  } catch {
    // not json, keep defaults
  }
  return new ApiError(code, res.status, message);
}

export type MeResult =
  | { kind: 'anonymous' }
  | { kind: 'banned'; reason: string }
  | { kind: 'authenticated'; data: AuthMeResponse };

export async function fetchMe(): Promise<MeResult> {
  const res = await fetch('/api/auth/me');
  if (res.status === 401) return { kind: 'anonymous' };
  if (res.status === 403) {
    try {
      const json = await res.json();
      const banned: AuthBannedResponse = AuthBannedResponseSchema.parse(json);
      return { kind: 'banned', reason: banned.reason };
    } catch {
      return { kind: 'anonymous' };
    }
  }
  if (!res.ok) throw await readError(res);
  const json = await res.json();
  return { kind: 'authenticated', data: AuthMeResponseSchema.parse(json) };
}

export async function ackNotice(id: string): Promise<void> {
  const res = await fetch(`/api/notices/${id}/ack`, { method: 'POST' });
  if (!res.ok && res.status !== 404) throw await readError(res);
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' });
}
