#!/usr/bin/env node
/**
 * Universal Capture Verification: Validates Phase 5 Telemetry & Metrics
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

function decodePayload(payload) {
  if (!payload) return null;
  if (payload.compressed && typeof payload.data === "string") {
    const compressedBuffer = Buffer.from(payload.data, "base64");
    let decompressed;
    try {
      decompressed = zlib.inflateSync(compressedBuffer);
    } catch {
      decompressed = zlib.inflateRawSync(compressedBuffer);
    }
    return JSON.parse(decompressed.toString("utf8"));
  }
  return payload;
}

async function verifyTelemetry(schema) {
  const metrics = schema?.metadata?.metrics;
  
  if (!metrics) {
    console.error("❌ FAIL: Schema metadata is missing 'metrics' field.");
    return false;
  }

  const { timings, stats } = metrics;

  // Validate Timings
  if (!timings) {
    console.error("❌ FAIL: Metrics is missing 'timings' field.");
    return false;
  }

  const requiredTimings = ["total", "analysis", "execution", "validation", "fallback"];
  for (const t of requiredTimings) {
    if (typeof timings[t] !== "number") {
      console.error(`❌ FAIL: Timing '${t}' is missing or not a number.`);
      return false;
    }
  }

  // Validate Stats
  if (!stats) {
    console.error("❌ FAIL: Metrics is missing 'stats' field.");
    return false;
  }

  const requiredStats = ["complexity", "elements", "gaps", "fallbacks"];
  for (const s of requiredStats) {
    if (typeof stats[s] !== "number") {
      console.error(`❌ FAIL: Stat '${s}' is missing or not a number.`);
      return false;
    }
  }

  console.log("✅ PASS: All required telemetry fields are present.");
  console.log(`📊 Statistics:
    - Total Duration: ${timings.total}ms
    - Element Count: ${stats.elements}
    - Gaps Detected: ${stats.gaps}
    - Fallbacks Applied: ${stats.fallbacks}
    - Complexity Score: ${stats.complexity}/100
  `);

  return true;
}

async function main() {
  const jobsPath = path.resolve("handoff-jobs.json");
  if (!fs.existsSync(jobsPath)) {
    console.log("ℹ️ Skipping verification: handoff-jobs.json not found.");
    return;
  }

  const jobs = JSON.parse(fs.readFileSync(jobsPath, "utf8"));
  const history = jobs.history || [];
  if (history.length === 0) {
    console.log("ℹ️ Skipping verification: No jobs in history.");
    return;
  }

  const entry = history[history.length - 1];
  const jobMetadata = Array.isArray(entry) ? entry[1] : entry;
  const schema = decodePayload(jobMetadata.payload);

  if (!schema) {
    console.error("❌ ERR: Could not decode payload from the latest job.");
    process.exit(1);
  }

  const ok = await verifyTelemetry(schema);
  process.exit(ok ? 0 : 1);
}

main().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
