#!/bin/sh
# Build main and deploy it to Cloudflare, then verify the site serves what we built.
# Requires `npx wrangler login` once on this machine.
set -eu
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/bin:$PATH"
npm run -s build
npx wrangler deploy
built=$(grep -o 'index-[A-Za-z0-9_-]*\.js' dist/index.html | head -1)
# The edge can take up to a minute to pick up a new version, so poll before failing.
for u in https://dashiell.app/ https://www.dashiell.app/ https://dashiell.d-john-pohlman.workers.dev/; do
  tries=0
  while :; do
    live=$(curl -s --max-time 20 -H 'Cache-Control: no-cache' "${u}?v=$(date +%s)" | grep -o 'index-[A-Za-z0-9_-]*\.js' | head -1)
    if [ "$live" = "$built" ]; then echo "OK   $u serves $built"; break; fi
    tries=$((tries + 1))
    if [ "$tries" -ge 12 ]; then echo "FAIL $u serves '$live', built $built (after 60s)"; exit 1; fi
    sleep 5
  done
done
