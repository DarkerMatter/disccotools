# disccotools

A modern replacement for Discotools, because the original works fine but where's the fun in leaving well enough alone.

It's a Discord role-icon maker. You pick a shape, throw a background behind it, stack some icons or text or your own uploaded images on top, and download a PNG. Then you do it eleven more times because the first eleven weren't quite right.

## What it actually does

- **Shapes.** Circles, rounded squares, hexagons, diamonds, stars, triangles, a gear, a scalloped badge thing, and roughly five shields that are all subtly different and that you will spend twenty minutes deciding between. The plain square is still in there but hidden from the UI, kept around purely so old saves don't explode.
- **Backgrounds.** Solid, gradient (with an angle slider, because of course), or transparent (rendered with a little checkerboard so you remember it's transparent and not just white).
- **Layers.** Icons from the entire Iconify catalogue (Lucide, Tabler, Phosphor, Material, and friends), text in whatever font you want, or your own uploaded images. Cap of 50 layers, which is 49 more than anyone needs and also somehow not enough.
- **Save it.** Sign in with Discord and your designs get saved. Mark some as templates. Clone the good ones. Delete the embarrassing ones.
- **Download it.** Six resolutions from a humble 32px up to a frankly excessive 1024px.

## How it's built

It's a pnpm monorepo with three pieces, each minding its own business.

### `packages/shared`
The brains. Zod schemas that both the frontend and backend import, so the `Recipe` shape (background + shape + layers) is defined exactly once and nobody gets to argue about it across the network boundary. Also home to `shapes.ts`, which generates every clip-path with actual trigonometry. Yes, there is a `for` loop computing gear teeth. It's fine. It's beautiful, even. One nice trick lives here too: icon colors used to be a bare string, and a Zod transform quietly upgrades that legacy format into the structured `{ kind: 'solid' }` shape so nothing downstream has to remember the old way ever existed.

### `apps/worker`
A [Hono](https://hono.dev) API running on Cloudflare Workers, with D1 (SQLite) for the rows and R2 for the bytes. It handles:

- Discord OAuth and JWT session cookies. Logout actually revokes the token via a denylist instead of politely asking the cookie to leave, with expired denylist rows getting swept up opportunistically so the table doesn't grow forever.
- Saves and assets CRUD, render uploads, cloning, templates, the whole gallery.
- Upload validation that sniffs the actual magic bytes of your file, so if you rename `virus.pdf` to `cat.png` it will notice and judge you accordingly. It even rejects a real JPEG that lied and called itself a PNG.
- Refusing to delete an asset that a save is still using, then handing back a 409 listing exactly which saves so you can't claim you didn't know.

There's a dev auth bypass for local work that requires flipping **two** separate env flags, specifically so that one sleepy typo in `wrangler.toml` can't accidentally turn off authentication in production. You're welcome, future me.

### `apps/spa`
React 18 + Vite + Zustand. A canvas editor that renders your recipe as live SVG (clip paths, gradient masks, the works), an undo/redo stack with a sensible history cap, an icon picker that lazily mounts a couple hundred icons at a time so your browser doesn't file a complaint, and a PNG exporter that pre-fetches every asset as a data URI to dodge canvas tainting. (If that sentence meant nothing to you: it's the difference between "download works" and "download mysteriously produces a blank image," and we picked the first one.)

State lives in a single Zustand store, theming is a light/dark context that respects your OS preference, and the routing is plain React Router with a couple of back-compat redirects for old bookmarks.

## How the pieces talk

The SPA and the worker pretend to be the same origin. In production a Cloudflare Workers Route maps `/api/*` straight to the worker. On the `*.pages.dev` preview hostname there's no such route, so a tiny Pages Function proxies `/api/*` across instead, stripping any client-supplied headers that try to spoof an IP or origin on the way through. Either way the frontend just calls `/api/whatever` and doesn't have to care which deployment it landed on.

## On testing

There are a lot of tests, and they test the annoying stuff rather than the easy stuff: ownership checks that 403 when you poke at someone else's save, the 409 when you delete an in-use asset, the magic-byte sniffer catching a file in a costume, and the dev-bypass logic confirming that one flag alone does nothing. The worker tests run against real miniflare D1 and R2, not mocks, so they fail for the same reasons production would.

## Made by

[Dimitri](https://dimitri.one).

## License

MIT. Do what you want, just don't blame me.