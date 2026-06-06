// pages.dev fallback: proxy /api/* to the worker when no Workers Route is bound. prod skips this.
// cloudflare gives us cf-connecting-ip, don't trust whatever the client pasted
const WORKER_URL = 'https://disccotools-worker.fts-gg.workers.dev';

const STRIP_HEADERS = [
  'x-forwarded-for',
  'x-real-ip',
  'forwarded',
  'x-forwarded-proto',
  'x-forwarded-host',
];

export const onRequest: PagesFunction = async (ctx) => {
  const url = new URL(ctx.request.url);
  const target = new URL(url.pathname + url.search, WORKER_URL).toString();

  const headers = new Headers(ctx.request.headers);
  for (const h of STRIP_HEADERS) headers.delete(h);

  return fetch(target, {
    method: ctx.request.method,
    headers,
    body: ctx.request.body,
    redirect: 'manual',
  });
};
