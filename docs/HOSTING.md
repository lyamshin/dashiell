# Hosting

Dashiell is a static site: `npm run build` writes `dist/`, and nothing runs on a server. Cloudflare Pages serves it from the GitHub repo and rebuilds on every push to `main`.

## One-time setup (Cloudflare dashboard)

1. Workers & Pages → Create → Pages → Connect to Git → pick `lyamshin/dashiell`.
2. Build settings:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Node version is read from `.node-version` (22).
3. Save and Deploy. The first build takes about a minute. The site appears at `<project>.pages.dev`.
4. Custom domain: Pages project → Custom domains → add the domain. If the domain is registered at Cloudflare, DNS is set automatically; otherwise add the CNAME it shows you.

## Every push to main redeploys

Pull requests get preview URLs automatically. Nothing else to do.

## Local

```
npm run dev       # dev server with hot reload
npm run build     # production build into dist/
npm run preview   # serve dist/ locally
```
