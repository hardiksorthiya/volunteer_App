#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Installing dependencies..."
npm install

if ! npm list -g @expo/ngrok >/dev/null 2>&1; then
  echo "==> Installing @expo/ngrok globally (required for tunnel mode)..."
  npm install -g @expo/ngrok@^4.1.0
fi

if ! npm list @expo/ngrok >/dev/null 2>&1; then
  echo "==> Installing @expo/ngrok locally..."
  npm install --save-dev @expo/ngrok@^4.1.0
fi

echo "==> Aligning Expo SDK packages..."
npx expo install expo expo-image-picker expo-updates 2>/dev/null || true

mkdir -p logs
chmod +x start-expo-pm2.sh scripts/start-tunnel-local.sh

if pm2 describe volunteer-connect-expo >/dev/null 2>&1; then
  echo "==> Reloading existing PM2 process..."
  pm2 restart ecosystem.config.js --update-env
else
  echo "==> Starting PM2 process..."
  pm2 start ecosystem.config.js
fi

pm2 save

# Ensure PM2 restarts after server reboot (safe if already configured).
if command -v systemctl >/dev/null 2>&1; then
  if ! systemctl is-enabled "pm2-${USER}" >/dev/null 2>&1 && ! systemctl is-enabled pm2-root >/dev/null 2>&1; then
    echo "==> Enabling PM2 on system boot..."
    pm2 startup systemd -u "$USER" --hp "$HOME" 2>/dev/null | tail -1 | bash 2>/dev/null || true
    pm2 save
  fi
fi

sleep 3
bash scripts/show-client-link.sh 2>/dev/null || true

echo ""
echo "Expo tunnel runs in the background — safe to close Cursor."
echo "  Client link:  npm run share"
echo "  Status:       npm run pm2:status"
echo "  Logs:         npm run pm2:logs"
echo "  Restart:      npm run pm2:restart"
echo ""
