#!/usr/bin/env bash
# Show QR code in terminal for the current Expo tunnel (requires qrencode).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TUNNEL_FILE="$ROOT_DIR/logs/tunnel-url.txt"

if [ ! -f "$TUNNEL_FILE" ]; then
  echo "No tunnel URL. Run: npm run pm2:start"
  exit 1
fi

https_url="$(tr -d '[:space:]' < "$TUNNEL_FILE")"
host="${https_url#https://}"
host="${host#http://}"
exp_url="exp://${host}"

echo "Expo Go link: $exp_url"
echo ""

if command -v qrencode >/dev/null 2>&1; then
  qrencode -t ANSIUTF8 "$exp_url"
else
  echo "(Install qrencode for QR in terminal: apt install qrencode)"
  echo "Share this link manually: $exp_url"
fi
