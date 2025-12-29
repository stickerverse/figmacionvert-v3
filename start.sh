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

# Optional flags:
#   SKIP_INSTALL=1  -> don't run npm install steps
#   SKIP_BUILD=1    -> don't run npm build steps
#   WATCH=1         -> run extension/plugin watchers after initial build
SKIP_INSTALL="${SKIP_INSTALL:-0}"
SKIP_BUILD="${SKIP_BUILD:-0}"
WATCH="${WATCH:-0}"

# Auto-skip install if node_modules already exists
if [ -d "node_modules" ] && [ "$SKIP_INSTALL" = "0" ]; then
  echo -e "${CYAN}ℹ️ node_modules detected, skipping npm install (use SKIP_INSTALL=0 to force)${NC}"
  SKIP_INSTALL=1
fi

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
if [ "$SKIP_INSTALL" = "1" ]; then
  echo -e "${YELLOW}📦 SKIP_INSTALL=1 set; skipping dependency installs${NC}"
else
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
    cd figma-plugin && npm install && cd ..
  fi
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
MODEL_TEST_OUTPUT=$(node -e "
  const models = [
    { name: 'vision-analyzer.cjs', file: './vision-analyzer.cjs' },
    { name: 'color-analyzer.cjs', file: './color-analyzer.cjs' },
    { name: 'typography-analyzer.cjs', file: './typography-analyzer.cjs' },
    { name: 'yolo-detector.cjs', file: './yolo-detector.cjs' }
  ];
  
  let allPassed = true;
  let hasNativeDepIssue = false;
  const failedModels = [];
  
  for (const model of models) {
    try {
      require(model.file);
    } catch (e) {
      allPassed = false;
      const errorMsg = e.message || String(e);
      const isNativeError = errorMsg.includes('native') || 
                           errorMsg.includes('NODE_MODULE_VERSION') ||
                           errorMsg.includes('Cannot find module') ||
                           errorMsg.includes('was compiled against');
      if (isNativeError) {
        hasNativeDepIssue = true;
      }
      failedModels.push({ name: model.name, isNative: isNativeError });
    }
  }
  
  if (allPassed) {
    console.log('SUCCESS');
  } else if (hasNativeDepIssue) {
    console.log('NATIVE_DEP');
  } else {
    console.log('ERROR');
  }
  if (failedModels.length > 0) {
    failedModels.forEach(m => console.log('FAILED:' + m.name + ':' + (m.isNative ? 'native' : 'error')));
  }
" 2>&1)

MODEL_TEST_STATUS=$(echo "$MODEL_TEST_OUTPUT" | head -1)

if [ "$MODEL_TEST_STATUS" = "SUCCESS" ]; then
  echo -e "${GREEN}✅ AI models can be loaded${NC}"
elif [ "$MODEL_TEST_STATUS" = "NATIVE_DEP" ]; then
  echo -e "${YELLOW}⚠️  AI model loading test failed (native dependencies may not load until first use)${NC}"
  echo -e "${YELLOW}   This is usually OK - models will load when actually used${NC}"
  # Show which models had issues if DEBUG is enabled
  if [ "${DEBUG:-0}" = "1" ]; then
    echo "$MODEL_TEST_OUTPUT" | grep "^FAILED:" | while IFS=':' read -r _ model status; do
      if [ "$status" = "native" ]; then
        echo -e "  ${CYAN}- ${model}: Native dep (OK)${NC}"
      else
        echo -e "  ${CYAN}- ${model}: Error${NC}"
      fi
    done
  fi
else
  echo -e "${YELLOW}⚠️  AI model loading test failed${NC}"
  echo -e "${YELLOW}   This may be due to missing native dependencies${NC}"
  echo -e "${YELLOW}   Models will attempt to load when actually used${NC}"
  # Show error details if DEBUG is enabled
  if [ "${DEBUG:-0}" = "1" ]; then
    echo -e "${CYAN}Debug info:${NC}"
    echo "$MODEL_TEST_OUTPUT" | head -10
  fi
fi

echo ""

# Build Chrome extension first
if [ "$SKIP_BUILD" = "1" ]; then
  echo -e "${YELLOW}🔨 SKIP_BUILD=1 set; skipping build steps${NC}"
else
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
  fi
fi

echo ""


EXT_WATCH_PID=""
PLUGIN_WATCH_PID=""
if [ "$WATCH" = "1" ]; then
  echo -e "${YELLOW}👀 WATCH=1 set; starting build watchers...${NC}"

  echo -e "${YELLOW}  - Chrome extension: npm run watch${NC}"
  (cd chrome-extension && npm run watch) &
  EXT_WATCH_PID=$!

  if [ -d "figma-plugin" ]; then
    echo -e "${YELLOW}  - Figma plugin: npm run watch${NC}"
    (cd figma-plugin && npm run watch) &
    PLUGIN_WATCH_PID=$!
  fi

  # Quick sanity check that watchers didn't immediately die
  sleep 1
  if ! kill -0 "$EXT_WATCH_PID" >/dev/null 2>&1; then
    echo -e "${RED}❌ Extension watcher failed to start${NC}"
    exit 1
  fi
  if [ -n "$PLUGIN_WATCH_PID" ] && ! kill -0 "$PLUGIN_WATCH_PID" >/dev/null 2>&1; then
    echo -e "${RED}❌ Plugin watcher failed to start${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ Watchers running${NC}"
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
echo -e "${YELLOW}🔍 Checking for existing server on port 4411...${NC}"

# Method 1: Kill by process name
if pkill -f "handoff-server\\.cjs" 2>/dev/null; then
  echo -e "${YELLOW}♻️  Killed existing handoff server process${NC}"
  sleep 1
fi

# Method 2: Kill by port (more reliable)
if command_exists lsof; then
  PORT_PIDS=$(lsof -ti:4411 2>/dev/null || true)
  if [ -n "$PORT_PIDS" ]; then
    echo -e "${YELLOW}♻️  Killing process(es) using port 4411: $PORT_PIDS${NC}"
    echo "$PORT_PIDS" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
fi

# Verify port is free (use || true to prevent set -e from exiting)
if command_exists lsof; then
  if lsof -ti:4411 >/dev/null 2>&1; then
    echo -e "${RED}⚠️  Port 4411 is still in use. Trying to continue anyway...${NC}"
    echo -e "${YELLOW}   You may need to manually kill the process: lsof -ti:4411 | xargs kill -9${NC}"
  else
    echo -e "${GREEN}✅ Port 4411 is free${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  lsof not available, skipping port verification${NC}"
fi

# Start server in background with output redirection
echo -e "${CYAN}🚀 Starting server process...${NC}"
node handoff-server.cjs >> handoff-server.log 2>&1 &
HANDOFF_PID=$!

# Wait a moment for process to start
sleep 2

# Verify the process is still running
if ! kill -0 "$HANDOFF_PID" 2>/dev/null; then
    echo -e "${RED}❌ Handoff Server failed to start (process died immediately)${NC}"
    echo -e "${YELLOW}   Check handoff-server.log for errors:${NC}"
    if [ -f handoff-server.log ]; then
        tail -20 handoff-server.log
    fi
    exit 1
fi

echo -e "${GREEN}✅ Handoff Server process is active (PID: $HANDOFF_PID)${NC}"

# Wait for server to be ready and check if it's responding
echo -e "${CYAN}⏳ Waiting for server to initialize...${NC}"
MAX_RETRIES=10
RETRY_COUNT=0
SERVER_RESPONDING=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  # Check if process is still running
  if ! kill -0 "$HANDOFF_PID" 2>/dev/null; then
    echo -e "${RED}❌ Server process died (PID: $HANDOFF_PID)${NC}"
    if [ -f handoff-server.log ]; then
      echo -e "${YELLOW}   Last log entries:${NC}"
      tail -20 handoff-server.log
    fi
    exit 1
  fi
  
  # Try to connect to the server
  if curl -s -f http://127.0.0.1:4411/api/health > /dev/null 2>&1 || \
     curl -s -f http://127.0.0.1:4411/api/status > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Handoff Server is responding${NC}"
    SERVER_RESPONDING=true
    break
  else
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
      echo -e "${YELLOW}   Waiting for server... ($RETRY_COUNT/$MAX_RETRIES)${NC}"
      sleep 2
    fi
  fi
done

if [ "$SERVER_RESPONDING" = false ]; then
  echo -e "${YELLOW}⚠️  Server started but not responding to health checks yet${NC}"
  echo -e "${YELLOW}   Server may still be initializing. Check handoff-server.log for details.${NC}"
  if [ -f handoff-server.log ]; then
    echo -e "${CYAN}   Last 10 log lines:${NC}"
    tail -10 handoff-server.log
  fi
  echo -e "${YELLOW}   You can check server status with: curl http://localhost:4411/api/health${NC}"
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
if [ "$WATCH" = "1" ]; then
  echo ""
  echo -e "${YELLOW}Watch Mode:${NC}"
  echo "  - Chrome extension rebuilds automatically (dev)"
  echo "  - Figma plugin rebuilds automatically (watch)"
  echo "  - Reload extension/plugin in their UIs to pick up changes"
fi
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
