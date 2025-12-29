#!/bin/bash

# Remove Unused Production Code
# Safely removes 11 unused files (16,246 lines)
# Creates archive before deletion for safety

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "🗑️  BlueprintAI - Remove Unused Production Code"
echo "=============================================="
echo ""

# Chrome Extension unused files
UNUSED_EXT=(
  "chrome-extension/src/utils/dom-extractor-old.ts"
  "chrome-extension/src/utils/comprehensive-state-capturer.ts"
  "chrome-extension/src/utils/theme-detector.ts"
  "chrome-extension/src/utils/layout-validator.ts"
  "chrome-extension/src/utils/state-capturer.ts"
  "chrome-extension/src/utils/variants-collector.ts"
  "chrome-extension/src/popup/figma-preview-renderer.ts"
  "chrome-extension/src/utils/progressive-asset-optimizer.ts"
  "chrome-extension/src/utils/preview-generator.ts"
  "chrome-extension/src/utils/page-readiness.test.ts"
)

# Figma Plugin unused files
UNUSED_PLUGIN=(
  "figma-plugin/src/variants-frame-builder.ts"
)

# Calculate total before deletion
TOTAL_LINES=0
TOTAL_SIZE=0
echo "Files to be removed:"
echo ""

for file in "${UNUSED_EXT[@]}" "${UNUSED_PLUGIN[@]}"; do
  if [ -f "$file" ]; then
    LINES=$(wc -l < "$file" 2>/dev/null || echo "0")
    TOTAL_LINES=$((TOTAL_LINES + LINES))
    SIZE_BYTES=$(wc -c < "$file" 2>/dev/null || echo "0")
    TOTAL_SIZE=$((TOTAL_SIZE + SIZE_BYTES))
    SIZE_KB=$((SIZE_BYTES / 1024))
    echo "  📄 $file"
    echo "     └─ $LINES lines, ${SIZE_KB}KB"
  fi
done

TOTAL_MB=$((TOTAL_SIZE / 1024 / 1024))
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total: $TOTAL_LINES lines, ${TOTAL_MB}MB"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "⚠️  Proceed with deletion? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deletion cancelled."
    exit 0
fi

# Create archive first (safety net)
ARCHIVE_DIR="scripts/archive/removed-code-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$ARCHIVE_DIR"
echo ""
echo "📦 Creating safety archive..."

for file in "${UNUSED_EXT[@]}" "${UNUSED_PLUGIN[@]}"; do
  if [ -f "$file" ]; then
    # Preserve directory structure in archive
    FILE_DIR=$(dirname "$file")
    ARCHIVE_SUBDIR="$ARCHIVE_DIR/$FILE_DIR"
    mkdir -p "$ARCHIVE_SUBDIR"
    cp "$file" "$ARCHIVE_SUBDIR/"
    echo "  ✓ Archived $file"
  fi
done

echo ""
echo "🗑️  Removing files..."
echo ""

REMOVED_COUNT=0
for file in "${UNUSED_EXT[@]}" "${UNUSED_PLUGIN[@]}"; do
  if [ -f "$file" ]; then
    rm "$file"
    echo "  ✓ Removed $file"
    ((REMOVED_COUNT++))
  fi
done

echo ""
echo "✅ Removal complete!"
echo ""
echo "📊 Summary:"
echo "   • Removed: $REMOVED_COUNT files"
echo "   • Total lines deleted: $TOTAL_LINES"
echo "   • Size freed: ${TOTAL_MB}MB"
echo "   • Archived in: $ARCHIVE_DIR"
echo ""
echo "🔍 Verification:"
echo "   Running import check to confirm files were not used..."
echo ""

# Verify no imports exist (should be silent)
FOUND_IMPORTS=0
for file in dom-extractor-old comprehensive-state-capturer theme-detector layout-validator state-capturer variants-collector figma-preview-renderer progressive-asset-optimizer preview-generator variants-frame-builder; do
  if grep -r "from.*$file\|require.*$file" chrome-extension/src figma-plugin/src --include="*.ts" 2>/dev/null | grep -v "${file}.ts:" > /dev/null; then
    echo "⚠️  WARNING: Found import for $file!"
    FOUND_IMPORTS=1
  fi
done

if [ "$FOUND_IMPORTS" -eq 0 ]; then
  echo "   ✅ Verified: No imports found (safe deletion confirmed)"
else
  echo "   ⚠️  Some imports found! Review before committing."
fi

echo ""
echo "📝 Next steps:"
echo "   1. Build to verify: npm run build:all"
echo "   2. Test extension: Load in Chrome and capture a page"
echo "   3. Test plugin: Import a capture in Figma"
echo "   4. Commit: git add -u && git commit -m 'chore: remove 11 unused files (~16k lines)'"
echo "   5. Archive can be deleted after 1 week if no issues"
echo ""
