#!/usr/bin/env bash
# Keep the Render free instance awake by pinging /api/health.
# Render spins free services down after ~15 min without traffic; ping every 10 min.
#
# Usage:   bash scripts/keepalive.sh https://TU-APP.onrender.com
#   or:    KEEPALIVE_URL=https://TU-APP.onrender.com bash scripts/keepalive.sh
# Cron (every 10 min):
#   */10 * * * * KEEPALIVE_URL=https://TU-APP.onrender.com /bin/bash /ruta/a/hilo-rosa/scripts/keepalive.sh >> /tmp/keepalive.log 2>&1
set -u
base="${1:-${KEEPALIVE_URL:-}}"
if [ -z "$base" ]; then
  echo "Falta la URL: bash scripts/keepalive.sh https://TU-APP.onrender.com" >&2
  exit 2
fi
url="${base%/}/api/health"
# 60 s timeout: a cold start on Render can take that long.
code=$(curl -s -o /dev/null -m 60 -w '%{http_code}' "$url")
echo "$(date -u +%FT%TZ) $url -> $code"
[ "$code" = "200" ]
