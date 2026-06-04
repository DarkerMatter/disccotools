import { AuthMeResponseSchema, type AuthMeResponse } from '@disccotools/shared';

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

/** Fetch wrapper for authed routes. On 401 redirects to login and throws. */
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
    // body wasn't JSON; keep defaults
  }
  return new ApiError(code, res.status, message);
}

/** Probe sign-in state. 401 is the "no" path, not an error. */
export async function fetchMe(): Promise<AuthMeResponse | null> {
  const res = await fetch('/api/auth/me');
  if (res.status === 401) return null;
  if (!res.ok) throw await readError(res);
  const json = await res.json();
  return AuthMeResponseSchema.parse(json);
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' });
}
