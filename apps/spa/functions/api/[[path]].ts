// Pages Function: proxy /api/* to the worker so SPA and worker share an origin.
// Needed on *.pages.dev where there's no Workers Route binding /api/* to the
// worker. In production the Workers Route handles /api/* directly and Pages
// never sees the request.
//
// Header hygiene: any client-supplied IP/origin header is stripped so
// downstream code can't be tricked by spoofed values. Cloudflare's
// `cf-connecting-ip` is the canonical trusted source for the real client IP.

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
