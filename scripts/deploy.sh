#!/bin/sh
# Build main and deploy it to Cloudflare, then verify the site serves what we built.
# Requires `npx wrangler login` once on this machine.
set -eu
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/bin:$PATH"
npm run -s build
npx wrangler deploy
built=$(grep -o 'index-[A-Za-z0-9_-]*\.js' dist/index.html | head -1)
sleep 5
for u in https://dashiell.app/ https://dashiell.d-john-pohlman.workers.dev/; do
  live=$(curl -s --max-time 20 "$u" | grep -o 'index-[A-Za-z0-9_-]*\.js' | head -1)
  if [ "$live" = "$built" ]; then echo "OK   $u serves $built"; else echo "FAIL $u serves '$live', built $built"; exit 1; fi
done
