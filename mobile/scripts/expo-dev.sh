#!/usr/bin/env bash
# Dev entry: use PM2 tunnel (persistent). Do not run a second Expo in this terminal.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if pm2 pid volunteer-connect-expo >/dev/null 2>&1; then
  echo "Expo is already running in the background (PM2: volunteer-connect-expo)."
  echo "This link stays active when you close Cursor."
  echo ""
  bash scripts/show-client-link.sh
  echo "Tailing live logs (Ctrl+C only stops this view, not the server)..."
  echo ""
  exec pm2 logs volunteer-connect-expo --lines 30
fi

echo "Starting persistent Expo tunnel (PM2)..."
bash scripts/pm2-start.sh
echo ""
bash scripts/show-client-link.sh
echo "Tailing live logs (Ctrl+C only stops this view, not the server)..."
echo ""
exec pm2 logs volunteer-connect-expo --lines 30
