#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"
METRO_PORT="${RCT_METRO_PORT:-8081}"
LOG_DIR="$ROOT_DIR/logs"
TUNNEL_URL_FILE="$LOG_DIR/tunnel-url.txt"
EXPO_BIN="$ROOT_DIR/node_modules/.bin/expo"
MAX_ATTEMPTS="${EXPO_START_ATTEMPTS:-3}"

mkdir -p "$LOG_DIR"

export EXPO_NO_TELEMETRY=1
export CI=0
export RCT_METRO_PORT="$METRO_PORT"

wait_for_port_free() {
  local port="$1"
  local i

  for i in $(seq 1 20); do
    if ! lsof -ti ":${port}" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${port}/tcp" 2>/dev/null || true
  else
    local pids
    pids="$(lsof -ti ":${port}" 2>/dev/null || true)"
    if [ -n "$pids" ]; then
      kill $pids 2>/dev/null || true
    fi
  fi
  sleep 2
}

reset_ngrok_if_stuck() {
  if curl -sf http://127.0.0.1:4040/api/tunnels >/dev/null 2>&1; then
    return 0
  fi
  pkill -f "@expo/ngrok-bin" 2>/dev/null || true
  sleep 2
}

save_tunnel_url() {
  local url
  url="$(curl -sf http://127.0.0.1:4040/api/tunnels 2>/dev/null \
    | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    for tunnel in data.get('tunnels', []):
        if tunnel.get('proto') == 'https':
            print(tunnel['public_url'])
            break
except Exception:
    pass
" 2>/dev/null || true)"

  if [ -n "$url" ]; then
    echo "$url" > "$TUNNEL_URL_FILE"
    echo "[$(date -Iseconds)] Expo tunnel URL: $url"
    return 0
  fi
  return 1
}

poll_tunnel_url() {
  local attempt
  for attempt in $(seq 1 45); do
    if save_tunnel_url; then
      return 0
    fi
    sleep 2
  done
  echo "[$(date -Iseconds)] Warning: could not detect tunnel URL from ngrok API" >&2
}

run_expo() {
  EXPO_PID=0
  "$EXPO_BIN" start --tunnel --port "$METRO_PORT" &
  EXPO_PID=$!
  wait "$EXPO_PID"
}

cleanup() {
  kill "$TUNNEL_POLL_PID" 2>/dev/null || true
  if [ "${EXPO_PID:-0}" -gt 0 ] 2>/dev/null; then
    kill -TERM "$EXPO_PID" 2>/dev/null || true
  fi
}
trap cleanup TERM INT EXIT

if [ ! -x "$EXPO_BIN" ]; then
  echo "Expo CLI not found. Run: npm install" >&2
  exit 1
fi

wait_for_port_free "$METRO_PORT"
reset_ngrok_if_stuck
sleep 2

poll_tunnel_url &
TUNNEL_POLL_PID=$!

attempt=1
while [ "$attempt" -le "$MAX_ATTEMPTS" ]; do
  if run_expo; then
    exit 0
  fi

  if [ "$attempt" -ge "$MAX_ATTEMPTS" ]; then
    echo "[$(date -Iseconds)] Expo failed after ${MAX_ATTEMPTS} attempts." >&2
    exit 1
  fi

  echo "[$(date -Iseconds)] Expo tunnel start failed (attempt ${attempt}/${MAX_ATTEMPTS}), retrying..." >&2
  reset_ngrok_if_stuck
  wait_for_port_free "$METRO_PORT"
  sleep 5
  attempt=$((attempt + 1))
done
