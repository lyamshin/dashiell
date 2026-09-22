# Hosting

Dashiell is a static site: `npm run build` writes `dist/`, nothing runs on a server. It is served by a **Cloudflare Worker with static assets** named `dashiell`, at https://dashiell.app (and www, and dashiell.d-john-pohlman.workers.dev).

## Deploying

Deploys are run from a logged-in machine, not by Cloudflare's git integration (that integration built but never deployed after the first day, for reasons its logs did not make visible from here). One-time: `npx wrangler login`. Then, after every merge to main:

```
npm run deploy
```

That builds, uploads `dist/` with wrangler, and **verifies** that dashiell.app serves the script hash just built. It fails loudly if the live site does not match. Do not consider a merge done until this has passed.

## Config

`wrangler.jsonc` names the Worker and points `assets.directory` at `dist/`. Custom domains are attached in the dashboard (Worker → Domains & Routes) and are deliberately not declared in the config.

## Local

```
npm run dev       # dev server with hot reload
npm run build     # production build into dist/
npm run preview   # serve dist/ locally
```
