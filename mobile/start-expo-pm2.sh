#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# Keep logs folder available for PM2 file output targets.
mkdir -p "$ROOT_DIR/logs"

# Expo tunnel URL is required for remote client checks.
export EXPO_NO_TELEMETRY=1
export CI=0

# PM2 will monitor this process; exec ensures correct PID tracking.
exec npx expo start --tunnel
