# Deploying Gladiator Ludus Manager

This is a fully client-side app: React + TypeScript + Vite, all game state in
`localStorage`, no backend, no API calls, no environment variables. Any static host
works.

## Build

```bash
npm install
npm run build
```

This runs `tsc -b && vite build`. Output goes to the `dist/` folder.

## Output folder

Deploy the contents of **`dist/`**. That's the whole site: `index.html`, a CSS
bundle, a JS bundle, and the favicon/icon SVGs. Nothing else is needed.

## Verifying the build locally before deploying

```bash
npm run build
npm run preview
```

`vite preview` serves the built `dist/` folder as static files on a local port (not
the dev server), the same way a static host will. Confirmed working as of this
writing: production build renders, saves/loads from `localStorage`, and every screen
functions identically to the dev server.

## Routing

There is none. The app is a single page with in-memory tab state (no React Router,
no URL-based navigation), so it needs no SPA fallback / rewrite rule on the host. Any
static host serving `index.html` at the root is sufficient -- no "redirect unknown
paths to index.html" config required.

## Subpath deploys

If the host serves the app from a subpath rather than the domain root (e.g. a GitHub
Pages project site at `username.github.io/repo-name/`), set `base` in
`vite.config.ts` to that subpath before building:

```ts
export default defineConfig({
  plugins: [react()],
  base: '/repo-name/',
})
```

Not needed for a root deploy (Netlify, Vercel, Cloudflare Pages, a custom domain, a
GitHub Pages user/org site, etc.) — the default (`/`) is correct there.

## No backend, no environment variables

Confirmed: no `fetch`/`XMLHttpRequest` calls, no `import.meta.env` or `process.env`
reads, no hardcoded origins or ports anywhere in `src/`. Everything the app needs
(game data, name pools) is bundled at build time; everything it produces (save data)
lives in the visiting browser's `localStorage`. There is nothing to configure on the
host beyond serving static files.
