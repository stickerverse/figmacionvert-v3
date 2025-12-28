#!/usr/bin/env node
/**
 * Schema guardrails: detects AI palette fills incorrectly applied to large nodes.
 *
 * Why: a recent regression filled huge layout containers with the screenshot's
 * "Vibrant" color (e.g. YouTube -> #f8be12), producing giant yellow/orange blocks
 * that hide real content.
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

function parseArgs(argv) {
  const args = {
    jobs: "handoff-jobs.json",
    jobId: null,
    maxAreaRatio: 0.05,
    epsilon: 1e-6,
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    switch (arg) {
      case "--jobs":
        args.jobs = next;
        i++;
        break;
      case "--job-id":
        args.jobId = next;
        i++;
        break;
      case "--max-area-ratio":
        args.maxAreaRatio = parseFloat(next);
        i++;
        break;
      case "--epsilon":
        args.epsilon = parseFloat(next);
        i++;
        break;
      default:
        break;
    }
  }
  return args;
}

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

function nearlyEqual(a, b, eps) {
  return Math.abs(a - b) <= eps;
}

function getVibrantFigmaColor(schema) {
  const palette = schema?.colorPalette?.palette;
  if (!palette || typeof palette !== "object") return null;
  const vibrant = palette.Vibrant || palette.vibrant || Object.values(palette)[0];
  const figma = vibrant?.figma;
  if (!figma) return null;
  return { r: figma.r, g: figma.g, b: figma.b };
}

function hasVibrantSolidFill(node, vibrant, eps) {
  if (!node?.fills || !Array.isArray(node.fills)) return false;
  for (const fill of node.fills) {
    if (!fill || fill.type !== "SOLID" || !fill.color) continue;
    const c = fill.color;
    if (
      nearlyEqual(c.r, vibrant.r, eps) &&
      nearlyEqual(c.g, vibrant.g, eps) &&
      nearlyEqual(c.b, vibrant.b, eps)
    ) {
      return true;
    }
  }
  return false;
}

function getViewport(schema) {
  const vp = schema?.metadata?.viewport || {};
  const width =
    vp.width ||
    vp.layoutViewportWidth ||
    schema?.metadata?.viewportWidth ||
    schema?.root?.layout?.width ||
    1440;
  const height =
    vp.height ||
    vp.layoutViewportHeight ||
    schema?.metadata?.viewportHeight ||
    schema?.root?.layout?.height ||
    900;
  return { width, height, area: Math.max(1, width * height) };
}

function walk(node, visit) {
  if (!node) return;
  visit(node);
  if (Array.isArray(node.children)) {
    for (const child of node.children) walk(child, visit);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const jobsPath = path.resolve(args.jobs);
  if (!fs.existsSync(jobsPath)) {
    console.error(`Jobs file not found: ${jobsPath}`);
    process.exit(2);
  }

  const jobs = JSON.parse(fs.readFileSync(jobsPath, "utf8"));
  const history = jobs.history || [];
  if (!Array.isArray(history) || history.length === 0) {
    console.error("No jobs in history.");
    process.exit(2);
  }

  let entry = null;
  if (args.jobId) {
    entry = history.find((num) => (Array.isArray(num) ? num[0] : num.id) === args.jobId) || null;
    if (!entry) {
      console.error(`Job not found: ${args.jobId}`);
      process.exit(2);
    }
  } else {
    entry = history[history.length - 1];
  }

  let jobId, jobMetadata;
  if (Array.isArray(entry)) {
      [jobId, jobMetadata] = entry;
  } else {
      jobId = entry.id;
      jobMetadata = entry;
  }
  
  let schema = decodePayload(jobMetadata.payload);
  
  // ERROR FIX: If local JSON doesn't have payload, try to fetch it from the running server
  if (!schema && jobId) {
      try {
          // Check if fetch matches Node environment (18+)
          if (typeof fetch === 'undefined') {
              console.warn("⚠️ fetch API not found (running old Node?), skipping server fetch.");
          } else {
              console.log(`Payload missing in local file. Fetching job ${jobId} from server...`);
              const resp = await fetch(`http://localhost:4411/api/jobs/${jobId}`);
              if (resp.ok) {
                  const data = await resp.json();
                  console.log('\n=== SERVER RESPONSE DEBUG ===');
                  console.log('Response data keys:', Object.keys(data));
                  if (data.job) {
                    console.log('data.job keys:', Object.keys(data.job));
                    if (data.job.payload) {
                      console.log('data.job.payload keys:', Object.keys(data.job.payload));
                      console.log('data.job.payload type:', typeof data.job.payload);
                    }
                  }
                  console.log('=== END SERVER RESPONSE DEBUG ===\n');
                  
                  if (data && data.job && data.job.payload) {
                      schema = decodePayload(data.job.payload);
                      console.log("✅ Fetched payload from server.");
                  }
              } else {
                  console.warn(`Failed to fetch job from server: ${resp.status}`);
              }
          }
      } catch (e) {
          console.warn(`Could not fetch job from server: ${e.message}`);
      }
  }

  // DEBUG: Comprehensive payload structure analysis
  console.log(`\n=== DEBUGGING PAYLOAD STRUCTURE FOR JOB ${jobId} ===`);
  console.log('Top-level payload keys:', schema ? Object.keys(schema) : 'null/undefined');
  
  if (schema?.data) {
    console.log('payload.data keys:', Object.keys(schema.data));
    if (schema.data.schema) {
      console.log('payload.data.schema keys:', Object.keys(schema.data.schema));
    }
  }
  
  if (schema?.cap) {
    console.log('payload.cap keys:', Object.keys(schema.cap));
    if (schema.cap.data) {
      console.log('payload.cap.data keys:', Object.keys(schema.cap.data));
    }
  }
  
  if (schema?.captures) {
    console.log('payload.captures length:', schema.captures.length);
    if (schema.captures[0]) {
      console.log('payload.captures[0] keys:', Object.keys(schema.captures[0]));
      if (schema.captures[0].data) {
        console.log('payload.captures[0].data keys:', Object.keys(schema.captures[0].data));
      }
    }
  }
  
  console.log('Direct schema properties:');
  console.log('- hasRoot:', !!schema?.root);
  console.log('- hasTree:', !!schema?.tree);
  console.log('- version:', schema?.version);
  console.log('- metadata:', !!schema?.metadata);
  console.log('- assets:', !!schema?.assets);
  console.log('=== END DEBUG ===\n');

  // Apply schema migration for validation
  if (schema?.tree && !schema?.root) {
    console.log(`Job ${jobId}: migrating legacy tree to root`);
    schema.root = schema.tree;
    delete schema.tree;
  }
  
  if (!schema?.root) {
    console.error(`Job ${jobId}: missing schema.root (checked local and server)`);
    process.exit(2);
  }

  const vibrant = getVibrantFigmaColor(schema);
  if (!vibrant) {
    console.log(`Job ${jobId}: no colorPalette.Vibrant; skipping guardrail.`);
    return;
  }

  const viewport = getViewport(schema);
  const maxArea = viewport.area * args.maxAreaRatio;

  const offenders = [];
  walk(schema.root, (node) => {
    if (!node?.layout) return;
    const area = (node.layout.width || 0) * (node.layout.height || 0);
    if (area <= maxArea) return;
    if (hasVibrantSolidFill(node, vibrant, args.epsilon)) {
      offenders.push({
        id: node.id,
        name: node.name,
        tag: node.htmlTag,
        type: node.type,
        width: node.layout.width,
        height: node.layout.height,
        area,
      });
    }
  });

  if (offenders.length > 0) {
    console.error(
      `FAIL: Job ${jobId} has ${offenders.length} large node(s) with Vibrant palette fill (threshold=${(
        args.maxAreaRatio * 100
      ).toFixed(1)}% viewport).`
    );
    console.error("First 10 offenders:");
    for (const o of offenders.slice(0, 10)) {
      console.error(
        `- ${o.type} ${o.tag} (${Math.round(o.width)}x${Math.round(
          o.height
        )}) id=${o.id} name=${o.name}`
      );
    }
    process.exit(1);
  }

  console.log(
    `PASS: Job ${jobId} has no large nodes with Vibrant palette fill.`
  );
}

main().catch((err) => {
  console.error("schema-guardrails failed:", err);
  process.exit(1);
});

