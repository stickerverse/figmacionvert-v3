#!/usr/bin/env bash
set -euo pipefail

# Unified setup script for local development
# - Builds chrome-extension, figma-plugin, and capture-service
# - Starts the local handoff server and capture-service API in the background
#
# Usage (from repo root):
#   chmod +x ./start-all.sh   # once
#   ./start-all.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() {
  echo "[start-all] $*"
}

# --- Chrome extension ---
log "Building chrome-extension..."
(
  cd "$ROOT_DIR/chrome-extension"
  npm install
  npm run build
)

# --- Figma plugin ---
log "Building figma-plugin..."
(
  cd "$ROOT_DIR/figma-plugin"
  npm install
  npm run build
)

# --- Capture service ---
log "Building capture-service..."
(
  cd "$ROOT_DIR/capture-service"
  npm install
  npm run build
)

# --- Start local handoff server (used by extension ↔ plugin) ---
log "Starting local handoff server (node handoff-server.js)..."
(
  cd "$ROOT_DIR"
  npm install
  npm run handoff-server
) &
HANDOFF_PID=$!

# --- Start capture-service API (optional cloud-style capture backend) ---
log "Starting capture-service API (npm start)..."
(
  cd "$ROOT_DIR/capture-service"
  npm start
) &
CAPTURE_SERVICE_PID=$!

log "All services started. PIDs: handoff=${HANDOFF_PID}, capture-service=${CAPTURE_SERVICE_PID}"
log "Use Ctrl+C to stop. Child processes will be terminated."

# Clean up child processes on exit
cleanup() {
  log "Shutting down services..."
  kill "${HANDOFF_PID}" "${CAPTURE_SERVICE_PID}" 2>/dev/null || true
}
trap cleanup EXIT

wait
