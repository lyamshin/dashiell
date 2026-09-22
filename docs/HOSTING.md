# Hosting

Dashiell is a static site: `npm run build` writes `dist/`, nothing runs on a server. It is served by **Cloudflare Pages**, which rebuilds on every push to `main`.

## One-time setup (Cloudflare dashboard)

1. Workers & Pages → **Create** → choose the **Pages** tab (not Workers) → **Import an existing Git repository** → `lyamshin/dashiell`.
2. Build settings:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Node version comes from `.node-version` (22).
3. **Save and Deploy**. About a minute. The site appears at `<project>.pages.dev`.
4. Custom domain: the Pages project → **Custom domains** → add it. If the domain is registered at Cloudflare, DNS is set automatically.

There is no deploy command in Pages. `wrangler.jsonc` only tells Pages where the build output is.

## Local

```
npm run dev       # dev server with hot reload
npm run build     # production build into dist/
npm run preview   # serve dist/ locally
```
