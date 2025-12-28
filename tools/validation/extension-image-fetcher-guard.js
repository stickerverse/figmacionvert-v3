/**
 * Regression guard: the MV3 background service worker cannot rely on DOM-only APIs
 * like FileReader, and cannot set forbidden headers like User-Agent.
 *
 * This script inspects the built `chrome-extension/dist/background.js`.
 */

const fs = require("fs");
const path = require("path");

const target = path.join(
  __dirname,
  "..",
  "..",
  "chrome-extension",
  "dist",
  "background.js"
);

if (!fs.existsSync(target)) {
  console.error(
    `Missing build output: ${target}\nRun \`npm run build:extension\` first.`
  );
  process.exit(2);
}

const code = fs.readFileSync(target, "utf8");

const forbidden = [
  { needle: "User-Agent", reason: "Forbidden request header in browser fetch" },
  { needle: "FileReader", reason: "Not available in MV3 service workers" },
  { needle: "readAsDataURL", reason: "Requires FileReader API" },
];

const hits = forbidden.filter((f) => code.includes(f.needle));
if (hits.length > 0) {
  console.error(
    "Extension image fetcher guard failed:\n" +
      hits.map((h) => `- Found "${h.needle}": ${h.reason}`).join("\n")
  );
  process.exit(1);
}

console.log("✅ Extension image fetcher guard passed");

