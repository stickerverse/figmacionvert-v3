#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() {
  echo "[start-servers] $*"
}

# 0. Cleanup Ports
log "Cleaning up ports 4411, 3000, 5050..."
PIDS=$(lsof -t -i:4411 -i:3000 -i:5050 2>/dev/null || true)
if [ -n "$PIDS" ]; then
  log "Killing existing processes: $PIDS"
  kill -9 $PIDS 2>/dev/null || true
fi

# 1. Build Everything
log "🏗️  Building Chrome Extension..."
(cd "$ROOT_DIR/chrome-extension" && npm run build)

log "🏗️  Building Capture Service..."
(cd "$ROOT_DIR/capture-service" && npm run build)

log "🏗️  Building Figma Plugin..."
(cd "$ROOT_DIR/figma-plugin" && npm run build)

log "✅ Build complete."

# 2. Start Servers
log "🚀 Starting Handoff Server (node handoff-server.js)..."
(
  cd "$ROOT_DIR"
  npm run handoff-server
) &
HANDOFF_PID=$!

log "🚀 Starting Capture Service (npm start)..."
(
  cd "$ROOT_DIR/capture-service"
  npm start
) &
CAPTURE_PID=$!

log "🚀 Starting Agent Runner (npm start)..."
(
  cd "$ROOT_DIR/agent-runner"
  npm start
) &
AGENT_PID=$!

log "✅ All 3 servers started."
log "PIDs: Handoff=$HANDOFF_PID, Capture=$CAPTURE_PID, Agent=$AGENT_PID"
log "Press Ctrl+C to stop all servers."

cleanup() {
  log "Shutting down services..."
  kill "$HANDOFF_PID" "$CAPTURE_PID" "$AGENT_PID" 2>/dev/null || true
}
trap cleanup EXIT

wait
