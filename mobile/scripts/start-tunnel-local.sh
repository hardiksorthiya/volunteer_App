#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
METRO_PORT="${RCT_METRO_PORT:-8081}"

if command -v pm2 >/dev/null 2>&1; then
  if pm2 pid volunteer-connect-expo >/dev/null 2>&1; then
    echo "Expo is already managed by PM2 (volunteer-connect-expo)."
    echo "Restart the tunnel with: npm run pm2:restart"
    echo "View logs with: npm run pm2:logs"
    exit 1
  fi
fi

if command -v lsof >/dev/null 2>&1 && lsof -ti ":${METRO_PORT}" >/dev/null 2>&1; then
  echo "Port ${METRO_PORT} is already in use. Stop the other Expo/Metro process first."
  echo "If this is the PM2 service, run: npm run pm2:restart"
  exit 1
fi

export EXPO_NO_TELEMETRY=1
export CI=0
export RCT_METRO_PORT="$METRO_PORT"

exec npx expo start --tunnel --port "$METRO_PORT" "$@"
