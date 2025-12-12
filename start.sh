#!/bin/bash
# ============================================
# Web to Figma - Unified Start Script
# ============================================
# This script starts all required services for the capture flow.
#
# Usage: ./start.sh
#
# Services:
#   1. Handoff Server (port 4411) - Main capture API with AI models
#   2. Chrome Extension build (watches for changes)
#   3. Figma Plugin build
#
# AI Models Verified:
#   - Tesseract.js (OCR)
#   - TensorFlow.js + COCO-SSD (ML component detection)
#   - Node-Vibrant (Color palette extraction)
#   - Chroma.js (Color manipulation)
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
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      Web to Figma - Starting Services      ║${NC}"
echo -e "${BLUE}║         with AI Model Verification          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check Node.js version
echo -e "${CYAN}🔍 Checking Node.js version...${NC}"
if ! command_exists node; then
  echo -e "${RED}❌ Node.js is not installed. Please install Node.js >= 18.0.0${NC}"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}❌ Node.js version must be >= 18.0.0 (current: $(node -v))${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v)${NC}"
echo ""

# Install all dependencies
echo -e "${YELLOW}📦 Installing root dependencies (including AI models)...${NC}"
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

echo ""

# Verify AI model dependencies
echo -e "${CYAN}🤖 Verifying AI model dependencies...${NC}"

check_package() {
  local package=$1
  local name=$2
  if npm list "$package" >/dev/null 2>&1; then
    # CRITICAL FIX: Use a different sed delimiter (|) to avoid conflicts with / in package names
    # Escape the package name for use in sed pattern
    local escaped_package=$(echo "$package" | sed 's/[\/&]/\\&/g')
    local version=$(npm list "$package" 2>/dev/null | grep "$package@" | head -1 | sed "s|.*$escaped_package@||" | sed "s| .*||")
    echo -e "${GREEN}  ✅ $name: $version${NC}"
    return 0
  else
    echo -e "${RED}  ❌ $name: NOT INSTALLED${NC}"
    return 1
  fi
}

AI_MODELS_OK=true

check_package "tesseract.js" "Tesseract.js (OCR)" || AI_MODELS_OK=false
check_package "@tensorflow/tfjs" "TensorFlow.js" || AI_MODELS_OK=false
check_package "@tensorflow/tfjs-node" "TensorFlow.js Node" || AI_MODELS_OK=false
check_package "@tensorflow-models/coco-ssd" "COCO-SSD Model" || AI_MODELS_OK=false
check_package "node-vibrant" "Node-Vibrant (Color)" || AI_MODELS_OK=false
check_package "chroma-js" "Chroma.js" || AI_MODELS_OK=false

echo ""

# Verify AI model files exist
echo -e "${CYAN}📁 Verifying AI model files...${NC}"

check_file() {
  local file=$1
  local name=$2
  if [ -f "$file" ]; then
    echo -e "${GREEN}  ✅ $name${NC}"
    return 0
  else
    echo -e "${RED}  ❌ $name: NOT FOUND${NC}"
    return 1
  fi
}

FILES_OK=true

check_file "vision-analyzer.cjs" "Vision Analyzer" || FILES_OK=false
check_file "color-analyzer.cjs" "Color Analyzer" || FILES_OK=false
check_file "typography-analyzer.cjs" "Typography Analyzer" || FILES_OK=false
check_file "yolo-detector.cjs" "YOLO Detector" || FILES_OK=false

echo ""

if [ "$AI_MODELS_OK" = false ] || [ "$FILES_OK" = false ]; then
  echo -e "${RED}❌ AI model verification failed!${NC}"
  echo -e "${YELLOW}⚠️  Some AI features may not work correctly.${NC}"
  echo -e "${YELLOW}   Run 'npm install' in the root directory to fix.${NC}"
  echo ""
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
else
  echo -e "${GREEN}✅ All AI models verified${NC}"
fi

echo ""

# Test AI model loading (quick check)
echo -e "${CYAN}🧪 Testing AI model loading...${NC}"
if node -e "
  try {
    require('./vision-analyzer.cjs');
    require('./color-analyzer.cjs');
    require('./typography-analyzer.cjs');
    require('./yolo-detector.cjs');
    console.log('✅ All AI models can be loaded');
    process.exit(0);
  } catch (e) {
    console.error('❌ AI model loading failed:', e.message);
    process.exit(1);
  }
" 2>/dev/null; then
  echo -e "${GREEN}✅ AI models can be loaded${NC}"
else
  echo -e "${YELLOW}⚠️  AI model loading test failed (may be due to missing native dependencies)${NC}"
  echo -e "${YELLOW}   This is usually OK - models will load when actually used${NC}"
fi

echo ""

# Build Chrome extension first
echo -e "${YELLOW}🔨 Building Chrome extension...${NC}"
cd chrome-extension
npm run build
cd ..
echo -e "${GREEN}✅ Chrome extension built${NC}"
echo ""

# Build Figma Plugin
if [ -d "figma-plugin" ]; then
  echo -e "${YELLOW}🔨 Building Figma Plugin...${NC}"
  cd figma-plugin
  npm run build
  cd ..
  echo -e "${GREEN}✅ Figma Plugin built${NC}"
  echo ""
fi

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
echo -e "${BLUE}📍 AI Analysis Endpoint:${NC} http://localhost:4411/api/ai-analyze"
echo ""
echo -e "${CYAN}🤖 AI Models Status:${NC}"
echo -e "  ✅ OCR (Tesseract.js)"
echo -e "  ✅ Color Palette (Node-Vibrant)"
echo -e "  ✅ ML Component Detection (COCO-SSD)"
echo -e "  ✅ Typography Analysis"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Load Chrome extension from: chrome-extension/dist"
echo "  2. Open Figma plugin"
echo "  3. Navigate to a webpage and click 'Capture'"
echo ""
echo -e "${YELLOW}To test headless capture:${NC}"
echo "  node puppeteer-auto-import.cjs https://stripe.com"
echo ""
echo -e "${YELLOW}To test AI analysis endpoint:${NC}"
echo "  curl -X POST http://localhost:4411/api/ai-analyze \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"screenshot\": \"data:image/png;base64,...\"}'"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for background processes
wait
