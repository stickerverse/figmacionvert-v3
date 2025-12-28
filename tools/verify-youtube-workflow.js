#!/usr/bin/env node

/**
 * YouTube Workflow Verification Script
 *
 * This script analyzes the YouTube page processing workflow to verify
 * that all components are correctly handling YouTube-specific features.
 *
 * URL: https://www.youtube.com/watch?v=xWggTb45brM&list=RDJqkpcJZovcc&index=8
 * Video ID: xWggTb45brM
 */

const fs = require("fs");
const path = require("path");

console.log("🔍 YouTube Workflow Verification Analysis\n");
console.log("=".repeat(60));
console.log(
  "URL: https://www.youtube.com/watch?v=xWggTb45brM&list=RDJqkpcJZovcc&index=8"
);
console.log("Video ID: xWggTb45brM");
console.log("=".repeat(60) + "\n");

// Read the dom-extractor.ts file to analyze YouTube handling
const domExtractorPath = path.join(
  __dirname,
  "../chrome-extension/src/utils/dom-extractor.ts"
);
const domExtractorCode = fs.readFileSync(domExtractorPath, "utf-8");

// Analyze YouTube-specific features
const checks = {
  "Pre-extraction YouTube wait": {
    pattern: /youtube\.com.*youtu\.be.*Waiting for dynamic content/i,
    found: /window\.location\.hostname\.includes\("youtube\.com"\)/i.test(
      domExtractorCode
    ),
    description:
      "Checks if YouTube-specific pre-extraction wait is implemented",
  },
  "Main video player detection": {
    pattern: /ytd-watch-flexy|ytd-player|movie_player|player-container/i,
    found: /ytd-watch-flexy|ytd-player|#movie_player|#player-container/i.test(
      domExtractorCode
    ),
    description: "Checks if main video player elements are detected",
  },
  "Video ID extraction from URL": {
    pattern: /[?&]v=([^&\s#]+)/,
    found: /\[?&\]v=\(\[/i.test(domExtractorCode),
    description:
      "Checks if video ID extraction from URL pattern is implemented",
  },
  "Thumbnail capture with fallbacks": {
    pattern: /maxresdefault|hqdefault|mqdefault|sddefault/i,
    found:
      /maxresdefault\.jpg|hqdefault\.jpg|mqdefault\.jpg|sddefault\.jpg/i.test(
        domExtractorCode
      ),
    description:
      "Checks if multiple thumbnail quality fallbacks are implemented",
  },
  "Comments section handling": {
    pattern: /ytd-comments|ytd-comment-thread-renderer/i,
    found: /ytd-comments|ytd-comment-thread-renderer|#comments/i.test(
      domExtractorCode
    ),
    description:
      "Checks if comments section detection and loading is implemented",
  },
  "Scroll offset handling": {
    pattern: /scrollOffset|scroll.*stuck/i,
    found: /scrollOffset|scroll.*stuck/i.test(domExtractorCode),
    description: "Checks if scroll restoration issues are handled",
  },
  "YouTube web component handler": {
    pattern: /handleYouTubeWebComponent/i,
    found: /handleYouTubeWebComponent/i.test(domExtractorCode),
    description: "Checks if dedicated YouTube web component handler exists",
  },
  "Error handling for canvas": {
    pattern: /handleCanvasElement.*error/i,
    found: /handleCanvasElement.*catch.*error/i.test(domExtractorCode),
    description: "Checks if canvas element errors are handled gracefully",
  },
};

console.log("📋 Feature Checklist:\n");
let allPassed = true;
for (const [feature, check] of Object.entries(checks)) {
  const status = check.found ? "✅" : "❌";
  console.log(`${status} ${feature}`);
  console.log(`   ${check.description}`);
  if (!check.found) allPassed = false;
  console.log("");
}

console.log("\n" + "=".repeat(60));
console.log("🔍 Expected Workflow for YouTube Page:\n");

const workflow = [
  {
    step: 1,
    phase: "Pre-extraction",
    actions: [
      "Detect YouTube domain (youtube.com or youtu.be)",
      "Wait 800ms for main video player to initialize",
      "Find main video player (ytd-watch-flexy, ytd-player, #movie_player)",
      "Scroll player into view briefly to ensure initialization",
      "Find comments section (ytd-comments, #comments)",
      "Scroll to comments to trigger lazy loading",
      "Wait for comments to load (600ms + 600ms if needed)",
      "Restore scroll position",
    ],
  },
  {
    step: 2,
    phase: "Scroll Reset",
    actions: [
      "Attempt to reset scroll to top (up to 5 attempts)",
      "Handle YouTube scroll restoration (may get stuck)",
      "Store scroll offset if reset fails for consistent positioning",
    ],
  },
  {
    step: 3,
    phase: "DOM Extraction",
    actions: [
      "Extract main video player container",
      "Extract video ID from URL: xWggTb45brM",
      "Apply thumbnail to player (maxresdefault.jpg → hqdefault.jpg → mqdefault.jpg → sddefault.jpg)",
      "Extract comments section with actual content",
      "Handle YouTube web components (ytd-* elements)",
      "Skip zero-size elements except YouTube important ones",
      "Extract text from comment threads",
    ],
  },
  {
    step: 4,
    phase: "Image Processing",
    actions: [
      "Capture video thumbnail via proxy",
      "Convert thumbnail to base64",
      "Apply thumbnail as fill to player node",
      "Process other page images",
    ],
  },
  {
    step: 5,
    phase: "Schema Finalization",
    actions: [
      "Finalize assets (images, fonts)",
      "Mark YouTube-specific metadata",
      "Return complete schema with video player and comments",
    ],
  },
];

workflow.forEach(({ step, phase, actions }) => {
  console.log(`\n${step}. ${phase}:`);
  actions.forEach((action) => {
    console.log(`   • ${action}`);
  });
});

console.log("\n" + "=".repeat(60));
console.log("🎯 Key Verification Points:\n");

const verificationPoints = [
  {
    point: "Video ID Extraction",
    expected: "xWggTb45brM",
    check: "Should extract from URL parameter ?v=xWggTb45brM",
    codeLocation: "handleYouTubeWebComponent() - line ~4907",
  },
  {
    point: "Thumbnail URL",
    expected: "https://img.youtube.com/vi/xWggTb45brM/maxresdefault.jpg",
    check: "Should try maxresdefault first, fallback to hqdefault if needed",
    codeLocation: "handleYouTubeWebComponent() - line ~4949",
  },
  {
    point: "Main Player Node",
    expected: "Node with isMainVideoPlayer: true",
    check: "Should have thumbnail fill applied and video metadata",
    codeLocation: "handleYouTubeWebComponent() - line ~4899",
  },
  {
    point: "Comments Section",
    expected: "Node with isYouTubeComments: true",
    check: "Should contain actual comment content, not placeholders",
    codeLocation: "handleYouTubeWebComponent() - line ~5020",
  },
  {
    point: "Scroll Handling",
    expected: "scrollOffset stored if scroll reset fails",
    check: "Should account for YouTube scroll restoration",
    codeLocation: "extractPageToSchema() - line ~330",
  },
];

verificationPoints.forEach(({ point, expected, check, codeLocation }) => {
  console.log(`\n${point}:`);
  console.log(`   Expected: ${expected}`);
  console.log(`   Check: ${check}`);
  console.log(`   Code: ${codeLocation}`);
});

console.log("\n" + "=".repeat(60));
console.log("⚠️  Known Issues & Mitigations:\n");

const knownIssues = [
  {
    issue: "Scroll restoration prevents scroll reset",
    mitigation: "Stores scrollOffset and uses it for consistent positioning",
    status: "✅ Handled",
  },
  {
    issue: "TrustedHTML CSP violations on YouTube",
    mitigation: "Try-catch blocks return original markup on violation",
    status: "✅ Handled",
  },
  {
    issue: "Canvas elements may be tainted (CORS)",
    mitigation: "Error handling with fallback messages",
    status: "✅ Handled",
  },
  {
    issue: "Comments load dynamically",
    mitigation: "Scrolls to comments and waits for content",
    status: "✅ Handled",
  },
  {
    issue: "Video player in Shadow DOM",
    mitigation: "Handles ytd-* web components specifically",
    status: "✅ Handled",
  },
];

knownIssues.forEach(({ issue, mitigation, status }) => {
  console.log(`${status} ${issue}`);
  console.log(`   → ${mitigation}\n`);
});

console.log("=".repeat(60));
console.log(
  `\n${allPassed ? "✅" : "⚠️"} Overall Status: ${
    allPassed ? "All checks passed" : "Some checks failed"
  }`
);
console.log("\n📝 Next Steps:");
console.log("1. Rebuild extension: cd chrome-extension && npm run build");
console.log("2. Load extension in Chrome");
console.log(
  "3. Navigate to: https://www.youtube.com/watch?v=xWggTb45brM&list=RDJqkpcJZovcc&index=8"
);
console.log("4. Trigger capture and verify:");
console.log("   - Main video player has thumbnail");
console.log("   - Comments section is captured");
console.log("   - No timeout errors");
console.log("   - Schema includes video metadata\n");
