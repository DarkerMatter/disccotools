import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

describe('GET /api/health', () => {
  it('returns 200 with status ok and apiVersion', async () => {
    const res = await SELF.fetch('http://example.com/api/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: 'ok', apiVersion: '1.0.2' });
  });
});

describe('unknown routes', () => {
  it('returns 404 with NOT_FOUND error envelope', async () => {
    const res = await SELF.fetch('http://example.com/api/nope');
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe('NOT_FOUND');
  });
});
