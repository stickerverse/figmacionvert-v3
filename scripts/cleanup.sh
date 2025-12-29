#!/bin/bash

# Codebase Cleanup Script
# Safely removes backup files, test artifacts, and organizes historical docs
# Total cleanup: ~120 MB

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "🧹 BlueprintAI Codebase Cleanup"
echo "================================"
echo ""
echo "Working directory: $PROJECT_ROOT"
echo ""

# Safety check
read -p "This will reorganize files. Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo ""
echo "Starting cleanup..."
echo ""

# Create archive directories
echo "📁 Creating archive directories..."
mkdir -p scripts/archive
mkdir -p docs/archive
mkdir -p tools

# 1. Remove backup files
echo "🗑️  Removing backup files..."
BACKUP_COUNT=$(find . -name "*.backup*" -type f | wc -l | tr -d ' ')
if [ "$BACKUP_COUNT" -gt 0 ]; then
    find . -name "*.backup*" -type f -delete
    echo "   ✓ Removed $BACKUP_COUNT backup files"
else
    echo "   ℹ️  No backup files found"
fi

# 2. Remove large test captures
echo "🗑️  Removing large test captures..."
REMOVED_CAPTURES=0
if [ -f "page-capture-1766834949060.json" ]; then
    SIZE=$(du -h "page-capture-1766834949060.json" | awk '{print $1}')
    rm "page-capture-1766834949060.json"
    echo "   ✓ Removed page-capture-1766834949060.json ($SIZE)"
    ((REMOVED_CAPTURES++))
fi
if [ -f "image-pipeline-report.json" ]; then
    SIZE=$(du -h "image-pipeline-report.json" | awk '{print $1}')
    rm "image-pipeline-report.json"
    echo "   ✓ Removed image-pipeline-report.json ($SIZE)"
    ((REMOVED_CAPTURES++))
fi
if [ "$REMOVED_CAPTURES" -eq 0 ]; then
    echo "   ℹ️  No large capture files found"
fi

# 3. Remove Puppeteer profile
echo "🗑️  Removing Puppeteer test profile..."
if [ -d ".puppeteer-profile-extension-test" ]; then
    SIZE=$(du -sh ".puppeteer-profile-extension-test" | awk '{print $1}')
    rm -rf ".puppeteer-profile-extension-test"
    echo "   ✓ Removed .puppeteer-profile-extension-test ($SIZE)"
else
    echo "   ℹ️  No Puppeteer profile found"
fi

# 4. Archive test scripts
echo "📦 Archiving test scripts..."
ARCHIVED_SCRIPTS=0
for script in test-*.js manual-*.js analyze-*.js; do
    if [ -f "$script" ]; then
        mv "$script" scripts/archive/
        echo "   ✓ Archived $script"
        ((ARCHIVED_SCRIPTS++))
    fi
done
if [ "$ARCHIVED_SCRIPTS" -eq 0 ]; then
    echo "   ℹ️  No test scripts to archive"
fi

# 5. Move utility to tools
echo "🔧 Organizing utilities..."
if [ -f "compress-figma-json.py" ]; then
    mv compress-figma-json.py tools/
    echo "   ✓ Moved compress-figma-json.py to tools/"
else
    echo "   ℹ️  compress-figma-json.py already in tools/ or not found"
fi

# 6. Archive historical documentation
echo "📚 Archiving historical documentation..."
ARCHIVED_DOCS=0

# AI Models integration history
for doc in AI_MODELS_*.md; do
    if [ -f "$doc" ]; then
        mv "$doc" docs/archive/
        echo "   ✓ Archived $doc"
        ((ARCHIVED_DOCS++))
    fi
done

# AI Schema enhancement
for doc in AI_SCHEMA_*.md CHROME_EXTENSION_AI_INTEGRATION.md; do
    if [ -f "$doc" ]; then
        mv "$doc" docs/archive/
        echo "   ✓ Archived $doc"
        ((ARCHIVED_DOCS++))
    fi
done

# Bug fix history
for doc in CRITICAL_FIXES_*.md DUPLICATE_HANDLER_FIX.md FIDELITY_ANALYSIS_AND_FIXES.md FIXES_APPLIED_SUMMARY.md IMAGE_FIXES_APPLIED.md WHITE_FRAME_BUG_FIX.md TAGNAME_TYPE_FIX.md; do
    if [ -f "$doc" ]; then
        mv "$doc" docs/archive/
        echo "   ✓ Archived $doc"
        ((ARCHIVED_DOCS++))
    fi
done

# Implementation logs
for doc in IMPLEMENTATION_*.md INTRINSIC_SIZE_IMPLEMENTATION.md PERSISTENT_POPUP_IMPLEMENTATION.md PHASE*.md RASTERIZATION_IMPLEMENTATION_COMPLETE.md; do
    if [ -f "$doc" ]; then
        mv "$doc" docs/archive/
        echo "   ✓ Archived $doc"
        ((ARCHIVED_DOCS++))
    fi
done

# Other historical docs
for doc in *_COMPLETE.md *_VERIFICATION.md; do
    if [ -f "$doc" ]; then
        # Skip recent important files
        if [[ "$doc" != "SCHEMA_IMPORT_VERIFICATION.md" ]]; then
            mv "$doc" docs/archive/
            echo "   ✓ Archived $doc"
            ((ARCHIVED_DOCS++))
        fi
    fi
done

# Restore important recent files if accidentally moved
if [ -f "docs/archive/SCHEMA_IMPORT_VERIFICATION.md" ]; then
    mv docs/archive/SCHEMA_IMPORT_VERIFICATION.md .
    echo "   ↩️  Kept SCHEMA_IMPORT_VERIFICATION.md (active reference)"
    ((ARCHIVED_DOCS--))
fi

if [ "$ARCHIVED_DOCS" -eq 0 ]; then
    echo "   ℹ️  No historical docs to archive"
fi

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📊 Summary:"
echo "   • Removed backup files: $BACKUP_COUNT"
echo "   • Removed large captures: $REMOVED_CAPTURES"
echo "   • Archived test scripts: $ARCHIVED_SCRIPTS"
echo "   • Archived docs: $ARCHIVED_DOCS"
echo ""
echo "📂 Archived files are in:"
echo "   • scripts/archive/"
echo "   • docs/archive/"
echo ""
echo "📝 Next steps:"
echo "   1. Review changes: git status"
echo "   2. Test builds: npm run build:all"
echo "   3. Commit: git add . && git commit -m 'chore: cleanup and reorganize artifacts'"
echo ""
