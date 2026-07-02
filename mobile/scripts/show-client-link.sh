#!/usr/bin/env bash
# Print the live Expo Go / tunnel link for clients (reads PM2 tunnel output).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TUNNEL_FILE="$ROOT_DIR/logs/tunnel-url.txt"
SLUG="volunteer-connect"

pm2_online() {
  pm2 pid volunteer-connect-expo >/dev/null 2>&1
}

read_tunnel() {
  if [ -f "$TUNNEL_FILE" ]; then
    tr -d '[:space:]' < "$TUNNEL_FILE"
  fi
}

https_url="$(read_tunnel)"

if [ -z "$https_url" ] && pm2_online; then
  echo "Waiting for tunnel URL (PM2 is starting)..."
  for _ in $(seq 1 30); do
    sleep 2
    https_url="$(read_tunnel)"
    [ -n "$https_url" ] && break
  done
fi

if [ -z "$https_url" ]; then
  echo "No tunnel URL yet."
  echo ""
  echo "Start the always-on Expo service first:"
  echo "  cd mobile && npm run pm2:start"
  echo ""
  echo "Then run this again:"
  echo "  npm run share"
  exit 1
fi

host="${https_url#https://}"
host="${host#http://}"
exp_url="exp://${host}"

cat <<EOF

══════════════════════════════════════════════════════════
  Volunteer Connect — client preview link (always on)
══════════════════════════════════════════════════════════

  Expo Go (open on phone):
    ${exp_url}

  Tunnel (browser / deep link):
    ${https_url}

  How clients open the app:
    1. Install "Expo Go" from Play Store / App Store
    2. Paste the exp:// link above into Expo Go, or scan QR from:
         npm run share:qr
    3. Link stays live while PM2 is running (survives closing Cursor)

  Service status:  npm run pm2:status
  Restart tunnel:  npm run pm2:restart
  View logs:       npm run pm2:logs

══════════════════════════════════════════════════════════

EOF
