# Hosting

Dashiell is a static site: `npm run build` writes `dist/`, nothing runs on a server. It is served by a **Cloudflare Worker with static assets**, connected to the GitHub repo, which rebuilds and redeploys on every push to `main`. (Cloudflare has folded Pages into Workers; there is no separate Pages flow.)

## Settings on the Worker (Workers & Pages → dashiell → Settings → Build)

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Root directory: `/`
- Node version comes from `.node-version` (22).

`wrangler.jsonc` in the repo tells wrangler to upload `dist/` as static assets and skip framework detection. That file is what makes the deploy command work; do not remove it.

## Domain

Worker → **Domains & Routes** → add the custom domain. If it is registered at Cloudflare, DNS is set automatically.

## Local

```
npm run dev       # dev server with hot reload
npm run build     # production build into dist/
npm run preview   # serve dist/ locally
npx wrangler deploy --dry-run   # verify the deploy config without deploying
```
