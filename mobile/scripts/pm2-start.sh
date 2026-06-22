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

echo ""
echo "Expo tunnel service started."
echo "  Status: npm run pm2:status"
echo "  Logs:   npm run pm2:logs"
echo "  URL:    cat logs/tunnel-url.txt  (available ~30s after start)"
echo ""
