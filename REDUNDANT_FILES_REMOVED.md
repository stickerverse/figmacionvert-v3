# Redundant and Unused Files Removed

**Date:** 2025-01-11  
**Action:** Moved unused/redundant files to Trash (not permanently deleted)

## Files Moved to Trash

### Unused TypeScript Source Files (4 files)

These files were not imported or referenced anywhere in the codebase:

1. **`figma-plugin/src/import-pipeline.ts`**

   - Status: Not imported anywhere
   - Reason: Legacy import pipeline, replaced by `enhanced-figma-importer.ts`

2. **`figma-plugin/src/physics-layout-solver.ts`**

   - Status: Stub file, not imported
   - Reason: Minimal stub with no-op methods, not used

3. **`figma-plugin/src/design-system-builder.ts`**

   - Status: Not imported anywhere
   - Reason: Unused design system builder functionality

4. **`figma-plugin/src/job-client.ts`**
   - Status: Only used by unused `import-pipeline.ts`
   - Reason: Job client for legacy import pipeline

### Temporary Files (1 file)

1. **`page-capture-1765495371964.json`**
   - Status: Temporary capture file
   - Reason: Generated during testing, no longer needed

### Build Artifacts (2 files)

1. **`web-to-figma-extension@1.0.0`**

   - Status: Empty directory
   - Reason: Build artifact, empty

2. **`webpack`**
   - Status: Empty file
   - Reason: Build artifact, empty

## Total Files Removed: 7

## Files Kept (Still in Use)

The following files were checked but are still actively used:

- All `.cjs` files (used by `handoff-server.cjs`)
- `shared/test-pages.ts` (test utilities)
- `chrome-extension/src/utils/page-readiness.test.ts` (test file)
- All other source files are actively imported and used

## Recovery

All files have been moved to macOS Trash (`~/.Trash`) and can be recovered if needed. They were NOT permanently deleted.
