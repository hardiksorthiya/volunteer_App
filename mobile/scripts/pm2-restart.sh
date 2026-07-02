#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! pm2 describe volunteer-connect-expo >/dev/null 2>&1; then
  echo "PM2 process not found. Run: npm run pm2:start"
  exit 1
fi

pm2 restart ecosystem.config.js --update-env
pm2 save

sleep 4
bash scripts/show-client-link.sh 2>/dev/null || echo "Tunnel URL will appear in logs/tunnel-url.txt within ~30s."

echo ""
echo "Restarted volunteer-connect-expo (runs in background; safe to close Cursor)."
