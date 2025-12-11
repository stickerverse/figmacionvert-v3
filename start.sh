#!/bin/bash
# ============================================
# Web to Figma - Unified Start Script
# ============================================
# This script starts all required services for the capture flow.
#
# Usage: ./start.sh
#
# Services:
#   1. Handoff Server (port 4411) - Main capture API
#   2. Chrome Extension build (watches for changes)
#
# After running:
#   - Open Chrome and load the extension from chrome-extension/dist
#   - Open Figma and load the plugin
#   - Click "Capture" in the extension popup
# ============================================

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      Web to Figma - Starting Services      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Install all dependencies
echo -e "${YELLOW}📦 Installing root dependencies...${NC}"
npm install

echo -e "${YELLOW}📦 Installing Chrome extension dependencies...${NC}"
cd chrome-extension && npm install && cd ..

if [ -d "capture-service" ]; then
  echo -e "${YELLOW}📦 Installing Capture Service dependencies...${NC}"
  cd capture-service && npm install && cd ..
fi

if [ -d "figma-plugin" ]; then
  echo -e "${YELLOW}📦 Installing Figma Plugin dependencies...${NC}"
  cd figma-plugin && npm install 2>/dev/null || true && cd ..
fi

# Build Chrome extension first
echo -e "${YELLOW}🔨 Building Chrome extension...${NC}"
cd chrome-extension
npm run build
cd ..
echo -e "${GREEN}✅ Chrome extension built${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
  echo ""
  echo -e "${YELLOW}🛑 Shutting down services...${NC}"
  kill $(jobs -p) 2>/dev/null
  exit 0
}
trap cleanup SIGINT SIGTERM

# Start Handoff Server
echo -e "${BLUE}🚀 Starting Handoff Server on port 4411...${NC}"

# Kill any existing handoff server to prevent port conflicts
pkill -f "node handoff-server" 2>/dev/null && echo -e "${YELLOW}♻️  Killed existing handoff server${NC}" && sleep 1

node handoff-server.cjs &
HANDOFF_PID=$!
echo -e "${GREEN}✅ Handoff Server started (PID: $HANDOFF_PID)${NC}"

# Wait for server to be ready
sleep 2

# Check if server is responding
if curl -s http://127.0.0.1:4411/api/status > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Handoff Server is responding${NC}"
else
  echo -e "${YELLOW}⚠️  Waiting for server to start...${NC}"
  sleep 3
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          All Services Running!             ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📍 Handoff Server:${NC} http://localhost:4411"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Load Chrome extension from: chrome-extension/dist"
echo "  2. Open Figma plugin"
echo "  3. Navigate to a webpage and click 'Capture'"
echo ""
echo -e "${YELLOW}To test headless capture:${NC}"
echo "  node puppeteer-auto-import.js https://stripe.com"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for background processes
wait
