// Pages Function: proxy /api/* to the worker so the SPA and worker share an origin.
// This is needed on the *.pages.dev hostname where there's no Workers Route binding
// /api/* to the worker. In production (icon.dimitri.one), the Workers Route handles
// /api/* directly and Pages never sees the request — this Function is dormant.
//
// Header hygiene: any client-supplied header that names a client IP or origin
// is stripped here so downstream code can't be tricked into trusting a spoofed
// value. Cloudflare attaches `cf-connecting-ip` itself, which is the canonical
// trusted source for the real client IP. This is a thin proxy with no business
// logic — no unit test; the strip behavior is verified by reading the code.

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
