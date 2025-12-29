const express = require("express");
const cors = require("cors");
const { v4: uuid } = require("uuid");
const fs = require("fs");
const https = require("https");
const http = require("http");
const path = require("path");

// Global error handling to prevent process crash from native/worker leaks (like Tesseract)
process.on("uncaughtException", (err) => {
  console.error("🔥 CRITICAL: Uncaught Exception:", err.message);
  console.error(err.stack);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("🔥 CRITICAL: Unhandled Rejection at:", promise, "reason:", reason);
});

// #region agent log
try {
  fs.appendFileSync(
    "/Users/skirk92/figmacionvert-2/.cursor/debug.log",
    JSON.stringify({
      id: "log_" + Date.now() + "_server_startup_marker",
      timestamp: Date.now(),
      location: "handoff-server.cjs:startup",
      message: "Handoff server process started (marker)",
      data: {
        pid: process.pid,
        node: process.version,
        schemaStatsInstrumentation: true,
      },
      sessionId: "debug-session",
      runId: "run3",
      hypothesisId: "H_SERVER_NOT_RESTARTED",
    }) + "\n"
  );
} catch (e) {}
// #endregion
let sharp = null;
try {
  sharp = require("sharp");
} catch (e) {
  sharp = null;
  console.warn("[handoff] sharp not available (image downscaling disabled)");
}

const fetchFn =
  typeof globalThis.fetch === "function"
    ? globalThis.fetch.bind(globalThis)
    : (() => {
        try {
          // Optional dependency; only used if the runtime doesn't provide fetch().
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          return require("node-fetch");
        } catch {
          return null;
        }
      })();

/**
 * Migrate legacy 'tree' property to canonical 'root' property
 * Ensures all schemas use the canonical hierarchy entry point
 */
function migrateSchemaHierarchy(schema) {
  if (!schema) return schema;
  
  // Migration case: tree exists but root doesn't
  if (schema.tree && !schema.root) {
    console.log("[handoff] 🔄 Migrating legacy 'tree' property to canonical 'root'");
    schema.root = schema.tree;
    delete schema.tree;
  }
  
  // Validation case: ensure we have root
  if (!schema.root && !schema.tree) {
    console.warn("[handoff] ⚠️ Schema has neither 'root' nor 'tree' property");
    return schema;
  }
  
  // Legacy compatibility: if only tree exists, use it as root
  if (schema.tree && !schema.root) {
    schema.root = schema.tree;
    delete schema.tree;
  }
  
  return schema;
}

async function hydrateMissingImageAssets(schema, opts = {}) {
  const assets = schema?.assets;
  const images = assets?.images;
  if (!images || typeof images !== "object") return { hydrated: 0, failed: 0 };

  const pageUrl =
    opts.pageUrl || schema?.metadata?.url || schema?.meta?.url || "";

  const concurrency = Math.max(1, Number(opts.concurrency || 6));
  const timeoutMs = Math.max(1000, Number(opts.timeoutMs || 20000));
  const maxBytes = Math.max(
    256 * 1024,
    Number(opts.maxBytes || 12 * 1024 * 1024)
  );

  if (!fetchFn) {
    console.warn("[handoff] fetch() unavailable; cannot hydrate images");
    return { hydrated: 0, failed: Object.keys(images).length };
  }

  const headersBase = {
    Accept: "image/png,image/jpeg,image/webp,image/gif,image/svg+xml,*/*;q=0.8",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ...(opts.cookieHeader ? { Cookie: opts.cookieHeader } : {}),
    ...(pageUrl ? { Referer: pageUrl } : {}),
  };

  const inferMimeFromUrl = (url) => {
    try {
      const u = new URL(url);
      const pathname = (u.pathname || "").toLowerCase();
      const ext = pathname.split(".").pop() || "";
      const byExt = {
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        webp: "image/webp",
        svg: "image/svg+xml",
        avif: "image/avif",
      };
      if (byExt[ext]) return byExt[ext];

      // Common format query params (Akamai/imgix-like)
      const qp =
        (u.searchParams.get("fm") ||
          u.searchParams.get("format") ||
          u.searchParams.get("fmt") ||
          u.searchParams.get("auto") ||
          "") + "";
      const qpl = qp.toLowerCase();
      if (qpl.includes("avif")) return "image/avif";
      if (qpl.includes("webp")) return "image/webp";
      if (qpl.includes("png")) return "image/png";
      if (qpl.includes("jpg") || qpl.includes("jpeg")) return "image/jpeg";
      if (qpl.includes("svg")) return "image/svg+xml";
      return "";
    } catch {
      return "";
    }
  };

  const keys = Object.keys(images);
  const queue = keys.filter((k) => {
    const asset = images[k] || {};
    const base64Candidate = asset.base64 || asset.data || asset.screenshot;
    const hasInline =
      typeof base64Candidate === "string" && base64Candidate.length > 0;
    const urlCandidate = asset.url || asset.absoluteUrl || asset.originalUrl;
    const hasUrl = typeof urlCandidate === "string" && urlCandidate.length > 0;
    return !hasInline && hasUrl;
  });

  if (queue.length === 0) {
    return { hydrated: 0, failed: 0 };
  }

  console.log(
    `[headless] Hydrating ${queue.length}/${keys.length} image asset(s) missing inline data...`
  );

  let hydrated = 0;
  let failed = 0;

  const runOne = async (key) => {
    const asset = images[key] || {};
    const url = asset.url || asset.absoluteUrl || asset.originalUrl;
    if (!url) return;

    const controller =
      typeof AbortController === "function" ? new AbortController() : null;
    const timeout = setTimeout(() => {
      try {
        controller?.abort();
      } catch {}
    }, timeoutMs);

    try {
      // Prefer a prefetched buffer from Puppeteer response interception when available.
      const prefetched = opts.prefetchedImages?.get?.(url) || null;
      const headerContentType = prefetched?.contentType
        ? String(prefetched.contentType).toLowerCase()
        : "";
      const inferredContentType = inferMimeFromUrl(url);
      let contentType = headerContentType || inferredContentType;
      let buffer;

      if (prefetched?.buffer && Buffer.isBuffer(prefetched.buffer)) {
        buffer = prefetched.buffer;
      } else {
        const resp = await fetchFn(url, {
          headers: {
            ...headersBase,
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          signal: controller ? controller.signal : undefined,
        });
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }

        const respContentType = (
          resp.headers?.get?.("content-type") || ""
        ).toLowerCase();
        contentType = respContentType || contentType;
        buffer = Buffer.from(await resp.arrayBuffer());
      }

      if (buffer.length === 0) throw new Error("Empty response");
      if (buffer.length > maxBytes) {
        throw new Error(
          `Image too large: ${(buffer.length / 1024 / 1024).toFixed(1)}MB`
        );
      }

      if (
        contentType.includes("image/svg") ||
        inferredContentType.includes("image/svg") ||
        /\.svg(\?|#|$)/i.test(url)
      ) {
        asset.svgCode = buffer.toString("utf8");
        asset.mimeType = "image/svg+xml";
        hydrated++;
        return;
      }

      let out = buffer;
      let outMime = contentType || asset.mimeType || "";

      // Figma plugin cannot reliably decode AVIF; transcode on the server when possible.
      if (outMime.includes("image/avif")) {
        if (!sharp) {
          throw new Error(
            "AVIF received but sharp is unavailable for transcode"
          );
        }
        out = await sharp(out).jpeg({ quality: 85 }).toBuffer();
        outMime = "image/jpeg";
      }

      const base64 = out.toString("base64");
      asset.data = base64;
      asset.base64 = base64;
      asset.mimeType = outMime || asset.mimeType;

      // Fill missing dimensions opportunistically
      if (
        sharp &&
        (!asset.width || !asset.height) &&
        !outMime.includes("svg") &&
        out.length > 0
      ) {
        try {
          const meta = await sharp(out).metadata();
          if (meta?.width && !asset.width) asset.width = meta.width;
          if (meta?.height && !asset.height) asset.height = meta.height;
        } catch {}
      }

      hydrated++;
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      asset.error = asset.error || `hydrate_failed: ${msg}`;
    } finally {
      clearTimeout(timeout);
    }
  };

  const workers = new Array(concurrency).fill(0).map(async () => {
    while (queue.length > 0) {
      const key = queue.shift();
      if (!key) return;
      await runOne(key);
    }
  });

  await Promise.all(workers);

  console.log("[headless] Image hydration complete", { hydrated, failed });
  return { hydrated, failed };
}
// Optional AI analyzers - load gracefully
let createVisionAnalyzer,
  extractColorPalette,
  analyzeTypography,
  analyzeSpacing,
  yoloDetect;
try {
  createVisionAnalyzer = require("./vision-analyzer.cjs").createVisionAnalyzer;
} catch (e) {
  createVisionAnalyzer = () => ({
    extractTextFromImage: async () => ({
      words: [],
      fullText: "",
      confidence: 0,
      duration: 0,
    }),
    analyzeScreenshot: async () => ({ components: [], summary: {} }),
    cleanup: async () => {},
  });
  console.warn("[handoff] vision-analyzer not available");
}
try {
  extractColorPalette = require("./color-analyzer.cjs").extractColorPalette;
} catch (e) {
  extractColorPalette = async () => ({
    theme: "light",
    tokens: {},
    css: "",
    palette: {},
  });
  console.warn("[handoff] color-analyzer not available");
}
try {
  const typo = require("./typography-analyzer.cjs");
  analyzeTypography = typo.analyzeTypography;
  analyzeSpacing = typo.analyzeSpacing;
} catch (e) {
  analyzeTypography = () => ({
    typeScale: { scale: "unknown", ratio: 1, baseSize: 16, roles: {} },
    families: [],
    tokens: {},
  });
  analyzeSpacing = () => ({ base: 8, scale: [] });
  console.warn("[handoff] typography-analyzer not available");
}
try {
  yoloDetect = require("./yolo-detector.cjs").detectComponents;
} catch (e) {
  yoloDetect = async () => ({
    detections: [],
    summary: { total: 0, byType: {} },
    imageSize: {},
    duration: 0,
  });
  console.warn("[handoff] yolo-detector not available");
}

const HOST = process.env.HANDOFF_HOST || "0.0.0.0";
const PORT = process.env.HANDOFF_PORT ? Number(process.env.HANDOFF_PORT) : 4411;
const BODY_LIMIT =
  Number(process.env.HANDOFF_MAX_PAYLOAD_MB || "5000") * 1024 * 1024; // bytes
const MAX_JOB_SIZE_MB = Number(process.env.HANDOFF_MAX_JOB_MB || "5000");
const STORAGE_FILE =
  process.env.HANDOFF_STORAGE_PATH || path.join(__dirname, "handoff-jobs.json");
const DEBUG_JOBS_DIR =
  process.env.HANDOFF_DEBUG_JOBS_DIR || path.join(__dirname, "jobs-debug");
const API_KEYS = (process.env.HANDOFF_API_KEYS || "")
  .split(",")
  .map((k) => k.trim())
  .filter(Boolean);
const TLS_KEY_PATH = process.env.HANDOFF_TLS_KEY || "";
const TLS_CERT_PATH = process.env.HANDOFF_TLS_CERT || "";
const USE_TLS = Boolean(TLS_KEY_PATH && TLS_CERT_PATH);

const app = express();
const queue = [];
let history = new Map();
let lastDeliveredJob = null;
const telemetry = {
  lastExtensionPingAt: null,
  lastExtensionTransferAt: null,
  lastPluginPollAt: null,
  lastPluginDeliveryAt: null,
  lastQueuedJobId: null,
  lastDeliveredJobId: null,
};

// Circuit breaker for expensive/unstable ML (YOLO) runs
const ML_CIRCUIT_BREAKER_TIMEOUTS = 2; // consecutive timeouts before opening circuit
const ML_CIRCUIT_BREAKER_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const mlCircuit = {
  consecutiveTimeouts: 0,
  openUntil: 0,
};

/**
 * Save job schema and screenshot to disk for debugging
 * Creates organized directory structure: jobs-debug/YYYY-MM-DD/job-{id}/
 */
function saveJobForDebugging(jobId, payload, metadata = {}) {
  try {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const timestamp = now.toISOString().replace(/[:.]/g, "-");
    
    // Create directory structure: jobs-debug/YYYY-MM-DD/job-{id}/
    const jobDir = path.join(DEBUG_JOBS_DIR, dateStr, `job-${jobId}`);
    if (!fs.existsSync(jobDir)) {
      fs.mkdirSync(jobDir, { recursive: true });
    }

    // Extract screenshot if available
    const screenshot = payload?.screenshot || 
                       payload?.metadata?.screenshot || 
                       payload?.meta?.screenshot;

    // Save full schema JSON
    const schemaPath = path.join(jobDir, "schema.json");
    const schemaToSave = {
      jobId,
      timestamp: now.toISOString(),
      metadata: {
        ...metadata,
        url: payload?.metadata?.url || payload?.meta?.url || metadata.url || "unknown",
        captureEngine: payload?.metadata?.captureEngine || payload?.meta?.captureEngine || metadata.captureEngine || "unknown",
        viewport: payload?.metadata?.viewport || payload?.meta?.viewport,
      },
      schema: payload,
    };
    fs.writeFileSync(schemaPath, JSON.stringify(schemaToSave, null, 2));
    console.log(`[handoff] 💾 Saved schema to ${schemaPath}`);

    // Save screenshot as PNG if available
    if (screenshot) {
      try {
        const screenshotPath = path.join(jobDir, "screenshot.png");
        // Screenshot can be base64 data URL or plain base64
        let base64Data = screenshot;
        if (screenshot.startsWith("data:image")) {
          // Extract base64 part from data URL
          base64Data = screenshot.split(",")[1] || screenshot;
        }
        const imageBuffer = Buffer.from(base64Data, "base64");
        fs.writeFileSync(screenshotPath, imageBuffer);
        console.log(`[handoff] 📸 Saved screenshot to ${screenshotPath}`);
      } catch (screenshotErr) {
        console.warn(`[handoff] ⚠️ Failed to save screenshot: ${screenshotErr.message}`);
      }
    } else {
      console.log(`[handoff] ℹ️ No screenshot available for job ${jobId}`);
    }

    // Save metadata summary for quick reference
    const metadataPath = path.join(jobDir, "metadata.json");
    const summary = {
      jobId,
      timestamp: now.toISOString(),
      url: schemaToSave.metadata.url,
      captureEngine: schemaToSave.metadata.captureEngine,
      hasScreenshot: !!screenshot,
      schemaStats: {
        hasRoot: !!payload?.root,
        hasTree: !!payload?.tree,
        rootChildren: payload?.root?.children?.length || 0,
        imageCount: payload?.assets?.images ? Object.keys(payload.assets.images).length : 0,
        fontCount: payload?.assets?.fonts ? Object.keys(payload.assets.fonts).length : 0,
        viewport: payload?.metadata?.viewport || payload?.meta?.viewport,
      },
    };
    fs.writeFileSync(metadataPath, JSON.stringify(summary, null, 2));

    return {
      schemaPath,
      screenshotPath: screenshot ? path.join(jobDir, "screenshot.png") : null,
      metadataPath,
      jobDir,
    };
  } catch (error) {
    console.error(`[handoff] ❌ Failed to save job ${jobId} for debugging: ${error.message}`);
    return null;
  }
}

function loadStorage() {
  try {
    if (!fs.existsSync(STORAGE_FILE)) return;
    const raw = fs.readFileSync(STORAGE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed.queue && Array.isArray(parsed.queue)) {
      queue.push(...parsed.queue);
    }
    if (parsed.history) {
      // FIX: Handle both formats - legacy Map entries and current metadata objects
      if (Array.isArray(parsed.history)) {
        if (parsed.history.length > 0) {
          // Check if it's the new format (objects with id/deliveredAt)
          if (parsed.history[0].id && parsed.history[0].deliveredAt) {
            // New format: array of metadata objects - reconstruct minimal jobs
            parsed.history.forEach(meta => {
              history.set(meta.id, {
                id: meta.id,
                deliveredAt: meta.deliveredAt,
                payload: null // Metadata only - payload not persisted
              });
            });
          } else {
            // Legacy format: array of [id, job] tuples
            history = new Map(parsed.history.map(([id, job]) => [id, job]));
          }
        }
      }
    }
    if (parsed.telemetry) Object.assign(telemetry, parsed.telemetry);
    if (parsed.lastDeliveredJob) lastDeliveredJob = parsed.lastDeliveredJob;
    console.log(`[handoff] Loaded persisted state from ${STORAGE_FILE}`);
  } catch (err) {
    console.warn(`[handoff] Failed to load storage: ${err.message}`);
    // Fallback: Initialize with empty state to prevent cascading failures
    history = new Map();
  }
}

function persistStorage() {
  try {
    // ENHANCED: Don't persist full payloads to avoid "Invalid string length" errors
    // Only persist metadata for large payloads
    const queueMetadata = queue.map((job) => ({
      id: job.id,
      timestamp: job.timestamp,
      permalink: job.permalink,
      hasPayload: !!job.payload,
      payloadSize: job.payload ? JSON.stringify(job.payload).length : 0,
      captureEngine:
        job.payload?.metadata?.captureEngine ||
        job.payload?.meta?.captureEngine,
      hasRoot: !!job.payload?.root,
    }));

    const historyMetadata = Array.from(history.entries()).map(([id, job]) => ({
      id,
      deliveredAt: job.deliveredAt,
      hasPayload: !!job.payload,
      payloadSize: job.payload ? JSON.stringify(job.payload).length : 0,
    }));

    const payload = {
      queue: queueMetadata,
      history: historyMetadata,
      telemetry,
      lastDeliveredJob: lastDeliveredJob
        ? {
            id: lastDeliveredJob.id,
            deliveredAt: lastDeliveredJob.deliveredAt,
            hasPayload: !!lastDeliveredJob.payload,
          }
        : null,
    };

    // Only persist if total size is reasonable (< 10MB)
    const payloadStr = JSON.stringify(payload, null, 2);
    if (payloadStr.length > 10 * 1024 * 1024) {
      console.warn(
        `[handoff] Storage payload too large (${(
          payloadStr.length /
          1024 /
          1024
        ).toFixed(2)}MB), skipping persistence`
      );
      return;
    }

    fs.writeFileSync(STORAGE_FILE, payloadStr);
  } catch (err) {
    console.warn(`[handoff] Failed to persist storage: ${err.message}`);
  }
}

function getBaseUrl() {
  const protocol = USE_TLS ? "https" : "http";
  const host = process.env.HANDOFF_PUBLIC_HOST || HOST || "localhost";
  return `${protocol}://${host}:${PORT}`;
}

function requireAuth(req, res, next) {
  if (!API_KEYS.length) return next(); // auth disabled
  if (req.path === "/api/health") return next();
  const headerKey =
    req.headers["x-api-key"] ||
    (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (headerKey && API_KEYS.includes(headerKey)) {
    return next();
  }
  return res.status(401).json({ ok: false, error: "Unauthorized" });
}

loadStorage();

// Basic request logger for diagnostics
app.use((req, _res, next) => {
  console.log(`[handoff] ${req.method} ${req.originalUrl}`);
  // #region agent log
  if (req.method === "POST") {
    try {
      fs.appendFileSync(
        "/Users/skirk92/figmacionvert-2/.cursor/debug.log",
        JSON.stringify({
          id: "log_" + Date.now() + "_req",
          timestamp: Date.now(),
          location: "handoff-server.cjs:107",
          message: "POST request received",
          data: {
            url: req.originalUrl,
            path: req.path,
            isJobs: req.originalUrl.includes("/api/jobs"),
            isHealthCheck: req.originalUrl.includes("/api/health"),
            hasBody: !!req.body,
            bodyType: typeof req.body,
          },
          sessionId: "debug-session",
          runId: "run1",
          hypothesisId: "A",
        }) + "\n"
      );
    } catch (e) {}
  }
  // #endregion
  next();
});

app.use(
  cors({
    origin: "*", // Allow all origins for local development
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-api-key",
      "cache-control",
    ],
    credentials: true,
    maxAge: 86400, // Cache preflight for 24 hours
  })
);

// Add Private Network Access headers manually
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Private-Network", "true");
  next();
});
app.use(express.json({ limit: BODY_LIMIT }));
app.use(requireAuth);

function getTelemetry() {
  return {
    ...telemetry,
    queueLength: queue.length,
  };
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  if (req.query.source === "extension") {
    telemetry.lastExtensionPingAt = Date.now();
  } else if (req.query.source === "plugin") {
    telemetry.lastPluginPollAt = Date.now();
  }

  res.json({ ok: true, queueLength: queue.length, telemetry: getTelemetry() });
});

// Extension heartbeat endpoint
app.post("/api/extension/heartbeat", (req, res) => {
  const { extensionId, version } = req.body || {};
  telemetry.lastExtensionPingAt = Date.now();
  console.log(`[handoff] Heartbeat from extension ${version}`);
  res.json({ status: "ok" });
});

// Remote logging endpoint
app.post("/api/log", (req, res) => {
  const { message, data } = req.body || {};
  console.log(`[EXT_LOG] ${message}`, data || "");
  res.json({ ok: true });
});

// Helper to fetch remote resources (Asset Proxy)
function fetchUrl(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) return reject(new Error("Too many redirects"));

    const client = url.startsWith("https") ? https : http;
    const req = client.get(url, (res) => {
      // Handle redirects
      if (
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location
      ) {
        const location = res.headers.location;
        const newUrl = new URL(location, url).href;
        return fetchUrl(newUrl, redirectCount + 1)
          .then(resolve)
          .catch(reject);
      }

      if (res.statusCode >= 400) {
        return reject(new Error(`Failed to fetch ${url}: ${res.statusCode}`));
      }

      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const buffer = Buffer.concat(chunks);
        const mime = res.headers["content-type"] || "application/octet-stream";
        resolve({ buffer, mime });
      });
    });

    req.on("error", (err) => reject(err));
    req.end();
  });
}

// Asset Proxy Endpoint
app.get("/api/proxy", async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ ok: false, error: "Missing url param" });
  }

  // Security: Prevent loopback/SSR requests to localhost/internal IPs if needed
  // For now, we allow it but ideally we'd filter private IPs.

  try {
    console.log(`[proxy] Fetching ${url}`);
    const { buffer, mime } = await fetchUrl(url);
    const base64 = buffer.toString("base64");

    res.json({
      ok: true,
      url,
      mime,
      data: `data:${mime};base64,${base64}`,
    });
  } catch (err) {
    console.error(`[proxy] Error fetching ${url}:`, err.message);
    res.status(502).json({ ok: false, error: err.message });
  }
});

// Status endpoint for new plugin/extension logic
app.get("/api/status", (req, res) => {
  const now = Date.now();
  const isExtensionOnline =
    telemetry.lastExtensionPingAt &&
    now - telemetry.lastExtensionPingAt < 30000;

  res.json({
    server: "ok",
    extension: isExtensionOnline ? "online" : "offline",
    telemetry: getTelemetry(),
    queueLength: queue.length,
  });
});

// Helper function to find first text node for analysis
function findFirstTextNode(node) {
  if (!node) return null;
  if (node.type === "TEXT") return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findFirstTextNode(child);
      if (found) return found;
    }
  }
  return null;
}

// LEGACY: Submit a new job - NOW DISABLED  
// Only extension captures are supported
app.post(["/api/jobs", "/"], (req, res) => {
  // #region agent log
  try {
    fs.appendFileSync(
      "/Users/skirk92/figmacionvert-2/.cursor/debug.log",
      JSON.stringify({
        id: "log_" + Date.now() + "_server1",
        timestamp: Date.now(),
        location: "handoff-server.cjs:233",
        message: "POST /api/jobs received",
        data: {
          hasBody: !!req.body,
          bodyKeys: req.body ? Object.keys(req.body) : [],
          isCompressed: req.body?.compressed === true,
          hasData: !!req.body?.data,
        },
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "A",
      }) + "\n"
    );
  } catch (e) {}
  // #endregion

  // Decompress payload if compressed (Hypothesis A: Server doesn't decompress before validation)
  let payloadToCheck = req.body;
  if (req.body?.compressed === true && typeof req.body.data === "string") {
    // #region agent log
    try {
      fs.appendFileSync(
        "/Users/skirk92/figmacionvert-2/.cursor/debug.log",
        JSON.stringify({
          id: "log_" + Date.now() + "_server2",
          timestamp: Date.now(),
          location: "handoff-server.cjs:240",
          message: "Attempting decompression",
          data: {
            dataLength: req.body.data.length,
            dataPrefix: req.body.data.substring(0, 50),
          },
          sessionId: "debug-session",
          runId: "run1",
          hypothesisId: "A",
        }) + "\n"
      );
    } catch (e) {}
    // #endregion

    let compressedBuffer;
    try {
      const zlib = require("zlib");
      // #region agent log
      try {
        fs.appendFileSync(
          "/Users/skirk92/figmacionvert-2/.cursor/debug.log",
          JSON.stringify({
            id: "log_" + Date.now() + "_decomp_step1",
            timestamp: Date.now(),
            location: "handoff-server.cjs:379",
            message: "Creating buffer from base64",
            data: {
              dataType: typeof req.body.data,
              dataLength: req.body.data?.length,
              dataPrefix: req.body.data?.substring(0, 20),
              dataSuffix: req.body.data?.substring(
                Math.max(0, (req.body.data?.length || 0) - 20)
              ),
              // Sample validation to avoid "Invalid string length" on huge strings
              isValidBase64Sample: req.body.data
                ? /^[A-Za-z0-9+/=]+$/.test(
                    req.body.data.substring(
                      0,
                      Math.min(1000, req.body.data.length)
                    )
                  )
                : false,
            },
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "D",
          }) + "\n"
        );
      } catch (e) {}
      // #endregion

      // Validate base64 string integrity
      if (!req.body.data || typeof req.body.data !== "string") {
        throw new Error("Missing or invalid base64 data string");
      }

      // Check if base64 string looks complete (ends with valid base64 chars or padding)
      const base64Str = req.body.data.trim();
      if (base64Str.length === 0) {
        throw new Error("Empty base64 string");
      }

      // Validate base64 format - sample check only (avoid regex on huge strings to prevent "Invalid string length")
      // Check first 1000 chars and last 100 chars for invalid characters
      const base64Regex = /^[A-Za-z0-9+/=]+$/;
      const sampleStart = base64Str.substring(
        0,
        Math.min(1000, base64Str.length)
      );
      const sampleEnd =
        base64Str.length > 1000
          ? base64Str.substring(Math.max(0, base64Str.length - 100))
          : "";
      if (
        !base64Regex.test(sampleStart) ||
        (sampleEnd && !base64Regex.test(sampleEnd))
      ) {
        throw new Error("Invalid base64 characters detected in sample");
      }

      const compressedBuffer = Buffer.from(base64Str, "base64");

      // Validate buffer was created correctly
      if (compressedBuffer.length === 0) {
        throw new Error("Buffer creation resulted in empty buffer");
      }

      // Expected buffer size should be approximately base64Length * 3/4 (base64 encoding ratio)
      const expectedMinBufferSize = Math.floor(base64Str.length * 0.75);
      if (compressedBuffer.length < expectedMinBufferSize * 0.9) {
        // #region agent log
        try {
          fs.appendFileSync(
            "/Users/skirk92/figmacionvert-2/.cursor/debug.log",
            JSON.stringify({
              id: "log_" + Date.now() + "_decomp_buffer_warning",
              timestamp: Date.now(),
              location: "handoff-server.cjs:401",
              message: "Buffer size suspiciously small",
              data: {
                base64Length: base64Str.length,
                bufferLength: compressedBuffer.length,
                expectedMinSize: expectedMinBufferSize,
                ratio: compressedBuffer.length / base64Str.length,
              },
              sessionId: "debug-session",
              runId: "run1",
              hypothesisId: "D",
            }) + "\n"
          );
        } catch (e) {}
        // #endregion
      }
      // #region agent log
      try {
        fs.appendFileSync(
          "/Users/skirk92/figmacionvert-2/.cursor/debug.log",
          JSON.stringify({
            id: "log_" + Date.now() + "_decomp_step2",
            timestamp: Date.now(),
            location: "handoff-server.cjs:381",
            message: "Buffer created, attempting zlib.inflateSync",
            data: {
              bufferLength: compressedBuffer.length,
              bufferFirstBytes: Array.from(compressedBuffer.slice(0, 10)),
            },
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "D",
          }) + "\n"
        );
      } catch (e) {}
      // #endregion
      // Try both formats - pako.deflate uses zlib format (with header) by default
      let decompressed;
      let formatUsed = "unknown";

      // First try zlib format (with header) - this is what pako.deflate uses
      try {
        // #region agent log
        try {
          fs.appendFileSync(
            "/Users/skirk92/figmacionvert-2/.cursor/debug.log",
            JSON.stringify({
              id: "log_" + Date.now() + "_decomp_step3",
              timestamp: Date.now(),
              location: "handoff-server.cjs:387",
              message: "About to call zlib.inflateSync",
              data: {},
              sessionId: "debug-session",
              runId: "run1",
              hypothesisId: "D",
            }) + "\n"
          );
        } catch (e) {}
        // #endregion
        decompressed = zlib.inflateSync(compressedBuffer);
        formatUsed = "zlib";
        // #region agent log
        try {
          fs.appendFileSync(
            "/Users/skirk92/figmacionvert-2/.cursor/debug.log",
            JSON.stringify({
              id: "log_" + Date.now() + "_decomp_step4",
              timestamp: Date.now(),
              location: "handoff-server.cjs:388",
              message: "zlib.inflateSync succeeded",
              data: { decompressedLength: decompressed.length },
              sessionId: "debug-session",
              runId: "run1",
              hypothesisId: "D",
            }) + "\n"
          );
        } catch (e) {}
        // #endregion
      } catch (zlibErr) {
        // #region agent log
        try {
          fs.appendFileSync(
            "/Users/skirk92/figmacionvert-2/.cursor/debug.log",
            JSON.stringify({
              id: "log_" + Date.now() + "_decomp_step5",
              timestamp: Date.now(),
              location: "handoff-server.cjs:389",
              message: "zlib.inflateSync failed, caught in inner catch",
              data: {
                error: zlibErr.message,
                errorName: zlibErr.name,
                errorStack: zlibErr.stack?.substring(0, 200),
              },
              sessionId: "debug-session",
              runId: "run1",
              hypothesisId: "D",
            }) + "\n"
          );
        } catch (e) {}
        // #endregion
        // #region agent log
        try {
          fs.appendFileSync(
            "/Users/skirk92/figmacionvert-2/.cursor/debug.log",
            JSON.stringify({
              id: "log_" + Date.now() + "_decomp_zlib_fail",
              timestamp: Date.now(),
              location: "handoff-server.cjs:264",
              message: "Zlib format failed, trying raw deflate",
              data: { error: zlibErr.message },
              sessionId: "debug-session",
              runId: "run1",
              hypothesisId: "D",
            }) + "\n"
          );
        } catch (e) {}
        // #endregion
        // If that fails, try raw deflate format as fallback
        try {
          decompressed = zlib.inflateRawSync(compressedBuffer);
          formatUsed = "raw";
        } catch (rawErr) {
          // #region agent log
          try {
            fs.appendFileSync(
              "/Users/skirk92/figmacionvert-2/.cursor/debug.log",
              JSON.stringify({
                id: "log_" + Date.now() + "_decomp_both_fail",
                timestamp: Date.now(),
                location: "handoff-server.cjs:272",
                message: "Both zlib and raw deflate failed",
                data: { zlibError: zlibErr.message, rawError: rawErr.message },
                sessionId: "debug-session",
                runId: "run1",
                hypothesisId: "D",
              }) + "\n"
            );
          } catch (e) {}
          // #endregion
          throw new Error(
            `Both zlib and raw deflate failed: zlib=${zlibErr.message}, raw=${rawErr.message}`
          );
        }
      }
      const decompressedString = decompressed.toString("utf8");
      payloadToCheck = JSON.parse(decompressedString);
      
      // CRITICAL FIX: Apply schema hierarchy migration immediately after decompression
      // This ensures 'tree' is converted to 'root' BEFORE saving to disk
      payloadToCheck = migrateSchemaHierarchy(payloadToCheck);

      // #region agent log
      try {
        fs.appendFileSync(
          "/Users/skirk92/figmacionvert-2/.cursor/debug.log",
          JSON.stringify({
            id: "log_" + Date.now() + "_server3",
            timestamp: Date.now(),
            location: "handoff-server.cjs:250",
            message: "Decompression successful",
            data: {
              formatUsed: formatUsed,
              hasRoot: !!payloadToCheck?.root,
              hasRoot: !!payloadToCheck?.root,
      hasTree: !!payloadToCheck?.tree,
              hasCaptures: !!payloadToCheck?.captures,
              hasSchema: !!payloadToCheck?.schema,
              hasMeta: !!payloadToCheck?.meta,
              hasMetadata: !!payloadToCheck?.metadata,
              payloadKeys: payloadToCheck ? Object.keys(payloadToCheck) : [],
            },
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "A",
          }) + "\n"
        );
      } catch (e) {}
      // #endregion
    } catch (decompressErr) {
      // #region agent log
      try {
        let bufferInfo = {};
        try {
          // Try to get buffer info if it was created
          bufferInfo = {
            bufferCreated: typeof compressedBuffer !== "undefined",
            bufferLength: compressedBuffer?.length,
          };
        } catch (e) {
          bufferInfo = { bufferCreated: false, error: "Buffer not accessible" };
        }
        fs.appendFileSync(
          "/Users/skirk92/figmacionvert-2/.cursor/debug.log",
          JSON.stringify({
            id: "log_" + Date.now() + "_server4",
            timestamp: Date.now(),
            location: "handoff-server.cjs:255",
            message: "Decompression failed",
            data: {
              error: decompressErr.message,
              errorName: decompressErr.name,
              errorStack: decompressErr.stack?.substring(0, 500),
              dataLength: req.body.data?.length,
              dataType: typeof req.body.data,
              ...bufferInfo,
            },
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "D",
          }) + "\n"
        );
      } catch (e) {}
      // #endregion
      console.warn(
        "[handoff] Failed to decompress payload:",
        decompressErr.message
      );
      // Continue with original body for fallback checks
    }
  }

  // CRITICAL FIX: Apply schema hierarchy migration for ALL payloads (compressed or not)
  // This ensures 'tree' is converted to 'root' BEFORE any processing
  payloadToCheck = migrateSchemaHierarchy(payloadToCheck);

  // Check if this is an extension-produced schema (has captureEngine metadata)
  // Check both 'meta' and 'metadata' fields
  // ENHANCED: Also check nested structures and compressed payloads
  // CRITICAL: Extension sets captureEngine in metadata.captureEngine
  let captureEngine =
    payloadToCheck?.meta?.captureEngine ||
    payloadToCheck?.metadata?.captureEngine ||
    payloadToCheck?.schema?.meta?.captureEngine ||
    payloadToCheck?.schema?.metadata?.captureEngine;

  // Fallback: If payload has root/tree but no explicit captureEngine, assume extension
  // (Puppeteer uses 'meta', extension uses 'metadata')
  if (!captureEngine && (payloadToCheck?.root || payloadToCheck?.tree)) {
    if (payloadToCheck?.metadata && !payloadToCheck?.meta) {
      // Has metadata but no meta = extension
      captureEngine = "extension";
    } else if (payloadToCheck?.meta && !payloadToCheck?.metadata) {
      // Has meta but no metadata = unknown legacy
      captureEngine = "unknown";
    } else if (payloadToCheck?.metadata) {
      // Has metadata = likely extension
      captureEngine = "extension";
    }
  }

  // ENHANCED: Debug logging for captureEngine detection
  if (!captureEngine && (payloadToCheck?.root || payloadToCheck?.tree)) {
    console.log(
      "[handoff] DEBUG: Payload has root/tree but no captureEngine detected",
      {
        hasMeta: !!payloadToCheck?.meta,
        hasMetadata: !!payloadToCheck?.metadata,
        metaKeys: payloadToCheck?.meta ? Object.keys(payloadToCheck.meta) : [],
        metadataKeys: payloadToCheck?.metadata
          ? Object.keys(payloadToCheck.metadata)
          : [],
        topLevelKeys: Object.keys(payloadToCheck || {}).slice(0, 10),
      }
    );
  }

  // #region agent log
  try {
    fs.appendFileSync(
      "/Users/skirk92/figmacionvert-2/.cursor/debug.log",
      JSON.stringify({
        id: "log_" + Date.now() + "_server5",
        timestamp: Date.now(),
        location: "handoff-server.cjs:265",
        message: "Checking captureEngine and schema structure",
        data: {
          captureEngine: captureEngine || null,
          hasRoot: !!payloadToCheck?.root,
      hasTree: !!payloadToCheck?.tree,
          hasCaptures: !!payloadToCheck?.captures,
          hasSchemaTree: !!payloadToCheck?.schema?.tree,
        },
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "B,C,E",
      }) + "\n"
    );
  } catch (e) {}
  // #endregion

  // CRITICAL FIX: Queue jobs from extension
  // Only extension captures are supported
  if (captureEngine === "extension") {
    // #region agent log
    try {
      const pageUrl =
        payloadToCheck?.metadata?.url ||
        payloadToCheck?.meta?.url ||
        payloadToCheck?.metadata?.pageUrl ||
        payloadToCheck?.meta?.pageUrl ||
        "";
      const root = payloadToCheck?.root || payloadToCheck?.tree || null;
      const rootChildren = Array.isArray(root?.children) ? root.children.length : 0;
      const imageCount = payloadToCheck?.assets?.images
        ? Object.keys(payloadToCheck.assets.images).length
        : 0;
      fs.appendFileSync(
        "/Users/skirk92/figmacionvert-2/.cursor/debug.log",
        JSON.stringify({
          id: "log_" + Date.now() + "_schema_stats",
          timestamp: Date.now(),
          location: "handoff-server.cjs:apiJobs:schemaStats",
          message: "Schema stats for queued job",
          data: {
            captureEngine,
            pageUrl,
            hasTree: !!root,
            rootType: root?.type || null,
            rootTag: root?.htmlTag || null,
            rootChildren,
            imageCount,
            topKeys: payloadToCheck ? Object.keys(payloadToCheck).slice(0, 15) : [],
          },
          sessionId: "debug-session",
          runId: "run2",
          hypothesisId: "H_SCHEMA_EMPTY",
        }) + "\n"
      );
    } catch (e) {}
    // #endregion

    // Allow both Puppeteer and Extension-produced schemas to be queued
    const job = {
      id: uuid(),
      timestamp: Date.now(),
      payload: payloadToCheck, // Use decompressed payload
    };
    job.permalink = `${getBaseUrl()}/api/jobs/${job.id}`;
    queue.push(job);
    history.set(job.id, job);
    persistStorage();

    // Save job for debugging
    const pageUrl = payloadToCheck?.metadata?.url || payloadToCheck?.meta?.url || "unknown";
    saveJobForDebugging(job.id, payloadToCheck, {
      url: pageUrl,
      captureEngine,
      queueLength: queue.length,
    });

    console.log(
      `[handoff] ✅ Received ${captureEngine} job ${job.id} (queue=${queue.length})`
    );
    console.log(`[handoff]    Payload has root: ${!!payloadToCheck?.root}`);
    if (payloadToCheck?.tree) {
      console.log(`[handoff]    ⚠️ Found legacy 'tree' property in payload`);
    }
    console.log(`[handoff]    Payload has assets: ${!!payloadToCheck?.assets}`);
    console.log(
      `[handoff]    Payload has metadata: ${!!payloadToCheck?.metadata}`
    );
    if (payloadToCheck?.assets?.images) {
      const imageCount = Object.keys(payloadToCheck.assets.images).length;
      console.log(`[handoff]    Image count: ${imageCount}`);
    }
    return res.json({
      ok: true,
      id: job.id,
      queueLength: queue.length,
      permalink: job.permalink,
    });
  }

  // Also accept extension-captured data (has tree property OR captures array)
  // ENHANCED: More comprehensive check for extension payloads
  const hasRoot = payloadToCheck?.root || payloadToCheck?.tree || payloadToCheck?.schema?.root || payloadToCheck?.schema?.tree;
  const hasCaptures =
    payloadToCheck?.captures || payloadToCheck?.schema?.captures;
  const isExtension =
    captureEngine === "extension" ||
    (hasRoot &&
      payloadToCheck?.metadata &&
      !payloadToCheck?.meta?.captureEngine);

  if (hasRoot || hasCaptures || isExtension) {
    // #region agent log - Analyze captured schema properties for visual discrepancy analysis
    try {
      const schema = (payloadToCheck?.root || payloadToCheck?.tree)
        ? payloadToCheck
        : payloadToCheck?.schema || payloadToCheck;
      const rootNode = schema?.root || schema?.tree;
      const sampleNode = rootNode?.children?.[0];
      const sampleTextNode = findFirstTextNode(rootNode);

      fs.appendFileSync(
        "/Users/skirk92/figmacionvert-2/.cursor/debug.log",
        JSON.stringify({
          id: "log_" + Date.now() + "_schema_analysis",
          timestamp: Date.now(),
          location: "handoff-server.cjs:338",
          message: "Schema properties analysis",
          data: {
            hasRoot: !!schema?.root,
            hasAssets: !!schema?.assets,
            hasMetadata: !!schema?.metadata,
            imageCount: schema?.assets?.images
              ? Object.keys(schema.assets.images).length
              : 0,
            fontCount: schema?.assets?.fonts
              ? Object.keys(schema.assets.fonts).length
              : 0,
            rootNodeType: rootNode?.type,
            rootNodeName: rootNode?.name,
            rootNodeHasFills: !!rootNode?.fills?.length,
            rootNodeHasBackgrounds: !!rootNode?.backgrounds?.length,
            rootNodeHasEffects: !!rootNode?.effects?.length,
            rootNodeCornerRadius: rootNode?.cornerRadius,
            rootNodeOpacity: rootNode?.opacity,
            sampleNodeType: sampleNode?.type,
            sampleNodeHasTextStyle: !!sampleNode?.textStyle,
            sampleNodeFontFamily: sampleNode?.textStyle?.fontFamily,
            sampleNodeFontSize: sampleNode?.textStyle?.fontSize,
            sampleNodeFontWeight: sampleNode?.textStyle?.fontWeight,
            sampleNodeLineHeight: sampleNode?.textStyle?.lineHeight,
            sampleNodeLetterSpacing: sampleNode?.textStyle?.letterSpacing,
            sampleNodeColor: sampleNode?.fills?.[0]?.color,
            sampleTextNodeType: sampleTextNode?.type,
            sampleTextNodeFontFamily: sampleTextNode?.textStyle?.fontFamily,
            sampleTextNodeFontSize: sampleTextNode?.textStyle?.fontSize,
          },
          sessionId: "debug-session",
          runId: "visual-analysis",
          hypothesisId: "visual-discrepancies",
        }) + "\n"
      );
    } catch (e) {}
    // #endregion

    const job = {
      id: uuid(),
      timestamp: Date.now(),
      payload: payloadToCheck, // Use decompressed payload
    };
    job.permalink = `${getBaseUrl()}/api/jobs/${job.id}`;
    queue.push(job);
    history.set(job.id, job);
    persistStorage();
    telemetry.lastExtensionTransferAt = Date.now();
    telemetry.lastQueuedJobId = job.id;

    // Save job for debugging
    const pageUrl = payloadToCheck?.metadata?.url || payloadToCheck?.meta?.url || "unknown";
    saveJobForDebugging(job.id, payloadToCheck, {
      url: pageUrl,
      captureEngine: "extension",
      queueLength: queue.length,
    });

    console.log(
      `[handoff] ✅ Received extension job ${job.id} (queue=${queue.length}) [FALLBACK PATH]`
    );
    console.log(`[handoff]    Payload has root: ${!!payloadToCheck?.root}`);
    if (payloadToCheck?.tree) {
      console.log(`[handoff]    ⚠️ Found legacy 'tree' property in payload`);
    }
    console.log(`[handoff]    Payload has assets: ${!!payloadToCheck?.assets}`);
    console.log(
      `[handoff]    Payload has metadata: ${!!payloadToCheck?.metadata}`
    );
    if (payloadToCheck?.assets?.images) {
      const imageCount = Object.keys(payloadToCheck.assets.images).length;
      console.log(`[handoff]    Image count: ${imageCount}`);
    }
    return res.json({
      ok: true,
      id: job.id,
      queueLength: queue.length,
      permalink: job.permalink,
    });
  }

  // Reject direct schema uploads - extension only
  // ENHANCED: Better error message with debug info
  // CRITICAL: But allow extension uploads (they have captureEngine: "extension")
  if (captureEngine === "extension") {
    // This should have been caught above, but if it wasn't, queue it now
    console.log(
      "[handoff] Extension payload detected in fallback, queueing..."
    );
    const job = {
      id: uuid(),
      timestamp: Date.now(),
      payload: payloadToCheck,
    };
    job.permalink = `${getBaseUrl()}/api/jobs/${job.id}`;
    queue.push(job);
    history.set(job.id, job);
    persistStorage();
    telemetry.lastExtensionTransferAt = Date.now();
    telemetry.lastQueuedJobId = job.id;

    // Save job for debugging
    const pageUrl = payloadToCheck?.metadata?.url || payloadToCheck?.meta?.url || "unknown";
    saveJobForDebugging(job.id, payloadToCheck, {
      url: pageUrl,
      captureEngine: "extension",
      queueLength: queue.length,
    });

    console.log(
      `[handoff] received extension job ${job.id} (queue=${queue.length})`
    );
    return res.json({
      ok: true,
      id: job.id,
      queueLength: queue.length,
      permalink: job.permalink,
    });
  }

  console.warn(
    "[handoff] Rejected legacy schema upload - extension only",
    {
      hasRoot: !!payloadToCheck?.root,
      hasTree: !!payloadToCheck?.tree,
      hasCaptures: !!payloadToCheck?.captures,
      hasSchema: !!payloadToCheck?.schema,
      captureEngine: captureEngine || "none",
      hasMetadata: !!payloadToCheck?.metadata,
      hasMeta: !!payloadToCheck?.meta,
      topLevelKeys: payloadToCheck
        ? Object.keys(payloadToCheck).slice(0, 10)
        : [],
    }
  );
  return res.status(410).json({
    ok: false,
    error:
      "Direct schema uploads are disabled. Use the Chrome extension to capture pages.",
    hint: "Install and use the Chrome extension to capture webpages.",
    debug: {
      hasRoot: !!payloadToCheck?.root,
      hasTree: !!payloadToCheck?.tree,
      captureEngine: captureEngine || "none",
      hasMetadata: !!payloadToCheck?.metadata,
      hasMeta: !!payloadToCheck?.meta,
    },
  });
});

// Get next job in queue (support both /api/jobs/next and /api/jobs for backward compatibility)
app.get(["/api/jobs/next", "/api/jobs"], (req, res) => {
  const job = queue.shift() || null;
  telemetry.lastPluginPollAt = Date.now();

  if (job) {
    telemetry.lastPluginDeliveryAt = Date.now();
    telemetry.lastDeliveredJobId = job.id;
    console.log(`[handoff] delivering job ${job.id} (queue=${queue.length})`);

    lastDeliveredJob = {
      id: job.id,
      payload: job.payload,
      screenshot: job.payload?.screenshot,
      deliveredAt: Date.now(),
    };
    history.set(job.id, lastDeliveredJob);
    persistStorage();

    // Save delivered job state (update or create if not saved on receipt)
    const pageUrl = job.payload?.metadata?.url || job.payload?.meta?.url || "unknown";
    const captureEngine = job.payload?.metadata?.captureEngine || job.payload?.meta?.captureEngine || "unknown";
    const saveResult = saveJobForDebugging(job.id, job.payload, {
      url: pageUrl,
      captureEngine,
      deliveredAt: new Date().toISOString(),
      queueLength: queue.length,
    });
    
    // Update metadata with delivery info if job was already saved
    if (saveResult && saveResult.metadataPath && fs.existsSync(saveResult.metadataPath)) {
      try {
        const metadata = JSON.parse(fs.readFileSync(saveResult.metadataPath, "utf8"));
        metadata.deliveredAt = new Date().toISOString();
        fs.writeFileSync(saveResult.metadataPath, JSON.stringify(metadata, null, 2));
      } catch (e) {
        // Ignore errors updating metadata
      }
    }

    // Format the response to match what the Figma plugin expects
    // CRITICAL FIX: Ensure payload is correctly extracted for extension format
    let jobPayload = job.payload;

    // Handle extension payload structure:
    // Extension sends schema directly: { tree, assets, metadata, ... }
    // 3. Multi-viewport format: { captures: [{ data: { tree, assets, ... } }] }
    if (jobPayload?.schema && typeof jobPayload.schema === "object" && (jobPayload.schema.root || jobPayload.schema.tree)) {
      console.log("[handoff] Unwrapping nested schema format");
      jobPayload = jobPayload.schema;
    }
    
    // Apply schema hierarchy migration early
    jobPayload = migrateSchemaHierarchy(jobPayload);
    
    // CRITICAL FIX: Handle multi-viewport format from Chrome extension
    // The extension sends: { version, multiViewport, captures: [{ data: { tree, assets } }] }
    if (Array.isArray(jobPayload?.captures) && jobPayload.captures.length > 0 && !jobPayload.root && !jobPayload.tree) {
      console.log("[handoff] Unwrapping multi-viewport capture format...");
      let picked = null;
      for (const cap of jobPayload.captures) {
        if (!cap) continue;
        // Try common shapes
        const candidate = cap.data?.root || cap.data?.tree
          ? cap.data
          : cap.data?.schema?.root || cap.data?.schema?.tree
          ? cap.data.schema
          : cap.data?.rawSchemaJson
          ? JSON.parse(cap.data.rawSchemaJson)
          : cap.data || cap.schema;
        if (candidate?.root || candidate?.tree) {
          picked = candidate;
          console.log(`[handoff] Using viewport: ${cap.viewport || cap.name || "unnamed"}`);
          // Preserve screenshot from capture if available
          if (!picked.screenshot && cap.data?.screenshot) {
            picked.screenshot = cap.data.screenshot;
          }
          break;
        }
        if (cap?.rawSchemaJson && !picked) {
          try {
            const parsed = JSON.parse(cap.rawSchemaJson);
            if (parsed?.tree) {
              picked = parsed;
              console.log(`[handoff] Parsed rawSchemaJson for viewport: ${cap.viewport || cap.name || "unnamed"}`);
              break;
            }
          } catch {
            // ignore parse error and continue
          }
        }
      }
      if (picked) {
        // Preserve metadata from wrapper if the picked schema doesn't have it
        if (!picked.metadata && jobPayload.metadata) {
          picked.metadata = jobPayload.metadata;
        }
        jobPayload = picked;
        
        // Apply schema hierarchy migration
        jobPayload = migrateSchemaHierarchy(jobPayload);
        
        console.log("[handoff] Successfully unwrapped multi-viewport format", {
          hasRoot: !!jobPayload.root,
          rootChildren: jobPayload.root?.children?.length || 0,
          hasAssets: !!jobPayload.assets,
          imageCount: jobPayload.assets?.images ? Object.keys(jobPayload.assets.images).length : 0,
        });
      } else {
        console.error("[handoff] Multi-viewport format detected but no valid capture data found");
      }
    }

    const response = {
      job: {
        id: job.id,
        payload: jobPayload, // Use the correctly extracted payload
        screenshot: jobPayload?.screenshot || job.payload?.screenshot,
        permalink: job.permalink || `${getBaseUrl()}/api/jobs/${job.id}`,
      },
      telemetry: getTelemetry(),
    };

    // Log the formatted response for debugging
    console.log(`[handoff] Sending formatted job response`, {
      jobId: response.job.id,
      hasPayload: !!response.job.payload,
      hasRoot: !!response.job.payload?.root,
      hasScreenshot: !!response.job.screenshot,
      payloadKeys: response.job.payload
        ? Object.keys(response.job.payload).slice(0, 10)
        : [],
      captureEngine:
        response.job.payload?.metadata?.captureEngine ||
        response.job.payload?.meta?.captureEngine,
    });

    res.json(response);
  } else {
    // No jobs available, but still return telemetry so the plugin knows the extension is connected
    res.json({
      job: null,
      telemetry: getTelemetry(),
    });
  }
});

// Peek at the last delivered job (for diagnostics/testing)
app.get("/api/jobs/last", (req, res) => {
  if (!lastDeliveredJob) {
    return res.status(204).end();
  }

  res.json({
    job: {
      ...lastDeliveredJob,
      permalink:
        lastDeliveredJob.permalink ||
        `${getBaseUrl()}/api/jobs/${lastDeliveredJob.id}`,
    },
    telemetry: getTelemetry(),
  });
});

// Retrieve a specific job by id (queue or history)
app.get("/api/jobs/:id", (req, res) => {
  const { id } = req.params;
  let job = history.get(id) || queue.find((j) => j.id === id);
  if (!job) {
    return res.status(404).json({ ok: false, error: "Job not found" });
  }

  // CRITICAL FIX: Load payload from disk if missing from memory
  // This happens after server restart or when payload was stripped for memory optimization
  if (!job.payload) {
    try {
      // Find the job directory in jobs-debug/YYYY-MM-DD/job-{id}/
      const jobsDebugDir = path.join(__dirname, "jobs-debug");
      if (fs.existsSync(jobsDebugDir)) {
        // Search in all date subdirectories (most recent first)
        const dateDirs = fs.readdirSync(jobsDebugDir)
          .filter((name) => fs.statSync(path.join(jobsDebugDir, name)).isDirectory())
          .sort()
          .reverse();

        for (const dateDir of dateDirs) {
          const jobDir = path.join(jobsDebugDir, dateDir, `job-${id}`);
          const schemaPath = path.join(jobDir, "schema.json");

          if (fs.existsSync(schemaPath)) {
            console.log(`[handoff] 📂 Loading payload from disk for job ${id}`);
            const diskData = JSON.parse(fs.readFileSync(schemaPath, "utf8"));

            // Extract the payload from the saved schema
            // The disk format is: { jobId, timestamp, metadata, schema: <actual payload> }
            // Apply migration since saved schema may have legacy 'tree' property
            job = {
              ...job,
              payload: migrateSchemaHierarchy(diskData.schema),
            };

            console.log(`[handoff] ✅ Loaded payload from ${schemaPath} (${JSON.stringify(job.payload).length} bytes)`);
            break;
          }
        }

        if (!job.payload) {
          console.warn(`[handoff] ⚠️ Payload not found on disk for job ${id}`);
        }
      }
    } catch (err) {
      console.error(`[handoff] ❌ Error loading payload from disk: ${err.message}`);
    }
  }

  res.json({
    job: {
      ...job,
      permalink: job.permalink || `${getBaseUrl()}/api/jobs/${job.id}`,
    },
    telemetry: getTelemetry(),
  });
});

// List recent jobs (limited to last 100 for safety)
app.get("/api/jobs/history", (_req, res) => {
  const recent = Array.from(history.values())
    .sort(
      (a, b) =>
        (b.deliveredAt || b.timestamp || 0) -
        (a.deliveredAt || a.timestamp || 0)
    )
    .slice(0, 100)
    .map((job) => ({
      id: job.id,
      timestamp: job.timestamp,
      deliveredAt: job.deliveredAt || null,
      permalink: job.permalink || `${getBaseUrl()}/api/jobs/${job.id}`,
      hasScreenshot: Boolean(job.screenshot || job.payload?.screenshot),
      size: job.payload ? JSON.stringify(job.payload).length : 0,
    }));
  res.json({ jobs: recent, telemetry: getTelemetry() });
});

// Capture a URL
/**
 * Run AI analysis on a screenshot
 * @param {string} screenshotBase64 - Base64 encoded screenshot
 * @returns {Promise<Object>} AI analysis results
 */
/**
 * Run AI analysis with per-model timeouts and detailed diagnostics
 */
async function runAIAnalysis(screenshotBase64, strictFidelity = true) {
  const results = {
    ocr: null,
    visionComponents: null,
    colorPalette: null,
    typography: null,
    spacingScale: null,
    mlComponents: null,
    errors: {},
    executionTracking: {
      vision: {
        called: false,
        started: null,
        completed: null,
        duration: null,
        timeout: false,
      },
      color: {
        called: false,
        started: null,
        completed: null,
        duration: null,
        timeout: false,
      },
      typography: {
        called: false,
        started: null,
        completed: null,
        duration: null,
        timeout: false,
      },
      ml: {
        called: false,
        started: null,
        completed: null,
        duration: null,
        timeout: false,
      },
    },
  };

  // Per-model timeout (20s each, allowing 3 models = 60s total)
  const MODEL_TIMEOUT = 20000; // 20 seconds per model

  /**
   * Helper to run a model with timeout and diagnostics
   */
  async function runModelWithTimeout(
    modelName,
    modelFn,
    trackingKey,
    timeoutMs = MODEL_TIMEOUT
  ) {
    console.log(`[ai-analysis] 🔍 [DIAG] Starting ${modelName}...`);
    results.executionTracking[trackingKey].called = true;
    results.executionTracking[trackingKey].started = Date.now();
    results.executionTracking[trackingKey].timeout = false;

    return Promise.race([
      modelFn().catch((err) => {
        const elapsed =
          Date.now() - results.executionTracking[trackingKey].started;
        console.error(
          `[ai-analysis] ❌ [DIAG] ${modelName} failed after ${elapsed}ms:`,
          err.message
        );
        throw err;
      }),
      new Promise((_, reject) =>
        setTimeout(() => {
          const elapsed =
            Date.now() - results.executionTracking[trackingKey].started;
          results.executionTracking[trackingKey].timeout = true;
          console.error(
            `[ai-analysis] ⏱️ [DIAG] ${modelName} TIMEOUT after ${elapsed}ms (${timeoutMs}ms limit)`
          );
          reject(
            new Error(
              `${modelName} timed out after ${elapsed}ms (limit: ${timeoutMs}ms)`
            )
          );
        }, timeoutMs)
      ),
    ]);
  }

  if (strictFidelity) {
    console.log(
      "[ai-analysis] 🛡️ [DIAG] Strict Fidelity mode enabled. Skipping speculative models (Color, ML)."
    );
  }

  // Run all models in parallel for better performance and diagnostics
  // Each model has its own 20s timeout, so failures don't block others
  console.log("[ai-analysis] 🚀 [DIAG] Starting all AI models in parallel...");
  const analysisStartTime = Date.now();
  const screenshotBuffer = Buffer.from(screenshotBase64, "base64");

  // Vision Analyzer (OCR + Component Detection)
  const visionPromise = (async () => {
    console.log("[ai-analysis] 🤖 [TRACK] Starting Vision Analyzer (OCR)...");
    results.executionTracking.vision.called = true;
    results.executionTracking.vision.started = Date.now();

    let visionAnalyzer = null;
    try {
      if (!createVisionAnalyzer) {
        throw new Error(
          "Vision analyzer not available - module failed to load"
        );
      }

      console.log(
        "[ai-analysis] 🔍 [DIAG] Creating Vision Analyzer instance..."
      );
      visionAnalyzer = createVisionAnalyzer({ debug: false });

      console.log("[ai-analysis] 🔍 [DIAG] Calling extractTextFromImage...");
      const ocrResult = await runModelWithTimeout(
        "Vision Analyzer (OCR)",
        async () => {
          return await visionAnalyzer.extractTextFromImage(screenshotBuffer);
        },
        "vision"
      );

      results.ocr = {
        fullText: ocrResult.fullText.substring(0, 5000),
        wordCount: ocrResult.words.length,
        confidence: ocrResult.confidence,
        duration: ocrResult.duration,
        words: ocrResult.words?.slice(0, 100),
      };
      results.executionTracking.vision.completed = Date.now();
      results.executionTracking.vision.duration =
        results.executionTracking.vision.completed -
        results.executionTracking.vision.started;

      console.log(
        `[ai-analysis] ✅ [TRACK] Vision Analyzer completed in ${
          results.executionTracking.vision.duration
        }ms - OCR extracted ${
          ocrResult.words.length
        } words (confidence: ${ocrResult.confidence.toFixed(2)})`
      );
      return true;
    } catch (visionErr) {
      results.executionTracking.vision.completed = Date.now();
      results.executionTracking.vision.duration =
        results.executionTracking.vision.completed -
        results.executionTracking.vision.started;
      const isTimeout = results.executionTracking.vision.timeout;
      console.error(
        `[ai-analysis] ❌ [TRACK] Vision Analyzer ${
          isTimeout ? "TIMED OUT" : "failed"
        } after ${results.executionTracking.vision.duration}ms:`,
        visionErr.message
      );
      results.errors.vision = visionErr.message;
      return false;
    } finally {
      if (visionAnalyzer) {
        console.log("[ai-analysis] 🔍 [DIAG] Cleaning up Vision Analyzer...");
        await visionAnalyzer.cleanup();
      }
    }
  })();

  // Color Palette Extraction
  const colorPromise = strictFidelity
    ? Promise.resolve(false)
    : (async () => {
    console.log("[ai-analysis] 🎨 [TRACK] Starting Color Analyzer...");
    results.executionTracking.color.called = true;
    results.executionTracking.color.started = Date.now();

    try {
      if (!extractColorPalette) {
        throw new Error("Color analyzer not available - module failed to load");
      }

      console.log("[ai-analysis] 🔍 [DIAG] Calling extractColorPalette...");
      const colorPalette = await runModelWithTimeout(
        "Color Analyzer",
        async () => {
          return await extractColorPalette(screenshotBuffer);
        },
        "color"
      );

      results.colorPalette = {
        theme: colorPalette.theme,
        tokens: colorPalette.tokens,
        css: colorPalette.css,
        palette: colorPalette.palette,
      };
      results.executionTracking.color.completed = Date.now();
      results.executionTracking.color.duration =
        results.executionTracking.color.completed -
        results.executionTracking.color.started;

      console.log(
        `[ai-analysis] ✅ [TRACK] Color Analyzer completed in ${
          results.executionTracking.color.duration
        }ms - theme: ${colorPalette.theme}, tokens: ${
          Object.keys(colorPalette.tokens).length
        }, colors: ${Object.keys(colorPalette.palette).length}`
      );
      return true;
    } catch (colorErr) {
      results.executionTracking.color.completed = Date.now();
      results.executionTracking.color.duration =
        results.executionTracking.color.completed -
        results.executionTracking.color.started;
      const isTimeout = results.executionTracking.color.timeout;
      console.error(
        `[ai-analysis] ❌ [TRACK] Color Analyzer ${
          isTimeout ? "TIMED OUT" : "failed"
        } after ${results.executionTracking.color.duration}ms:`,
        colorErr.message
      );
      results.errors.color = colorErr.message;
      return false;
    }
  })();

  // YOLO ML Component Detection
  const mlPromise = strictFidelity
    ? Promise.resolve(false)
    : (async () => {
    console.log(
      "[ai-analysis] 🤖 [TRACK] Starting YOLO ML Component Detection..."
    );
    results.executionTracking.ml.called = true;
    results.executionTracking.ml.started = Date.now();
    results.executionTracking.ml.attempts = [];

    try {
      if (!yoloDetect) {
        throw new Error("YOLO detector not available - module failed to load");
      }
      const now = Date.now();
      if (mlCircuit.openUntil && now < mlCircuit.openUntil) {
        const remaining = mlCircuit.openUntil - now;
        const msg = `YOLO skipped (circuit breaker open for ${Math.ceil(
          remaining / 1000
        )}s)`;
        console.warn(`[ai-analysis] ⚠️ [TRACK] ${msg}`);
        results.errors.ml = msg;
        results.executionTracking.ml.completed = now;
        results.executionTracking.ml.duration =
          results.executionTracking.ml.completed -
          results.executionTracking.ml.started;
        return false;
      }

      const downscaleForMl = async (maxDim) => {
        if (!sharp) return screenshotBuffer;
        try {
          const img = sharp(screenshotBuffer);
          const meta = await img.metadata();
          const w = meta.width || 0;
          const h = meta.height || 0;
          if (!w || !h) return screenshotBuffer;
          if (Math.max(w, h) <= maxDim) return screenshotBuffer;
          return await img
            .resize({
              width: maxDim,
              height: maxDim,
              fit: "inside",
              withoutEnlargement: true,
            })
            .png()
            .toBuffer();
        } catch (e) {
          console.warn(
            `[ai-analysis] ⚠️ [DIAG] ML downscale failed, using original buffer: ${String(
              e?.message || e
            )}`
          );
          return screenshotBuffer;
        }
      };

      const attempts = [
        { label: "downscale-1024", maxDim: 1024, timeoutMs: 12000 },
        { label: "downscale-640", maxDim: 640, timeoutMs: 8000 },
      ];

      let mlDetections = null;
      let lastError = null;

      for (const attempt of attempts) {
        const attemptStart = Date.now();
        try {
          const inputBuffer = await downscaleForMl(attempt.maxDim);
          console.log(
            `[ai-analysis] 🔍 [DIAG] Calling yoloDetect (${attempt.label}, timeout=${attempt.timeoutMs}ms)...`
          );

          const detections = await runModelWithTimeout(
            "YOLO Detector",
            async () => {
              return await yoloDetect(inputBuffer);
            },
            "ml",
            attempt.timeoutMs
          );

          results.executionTracking.ml.attempts.push({
            label: attempt.label,
            maxDim: attempt.maxDim,
            timeoutMs: attempt.timeoutMs,
            durationMs: Date.now() - attemptStart,
            timeout: false,
            ok: true,
          });

          mlDetections = detections;
          break;
        } catch (err) {
          const message = err?.message || String(err);
          const wasTimeout = String(message).includes("timed out");
          results.executionTracking.ml.attempts.push({
            label: attempt.label,
            maxDim: attempt.maxDim,
            timeoutMs: attempt.timeoutMs,
            durationMs: Date.now() - attemptStart,
            timeout: wasTimeout,
            ok: false,
            error: message,
          });
          lastError = err;
          if (!wasTimeout) {
            break;
          }
        }
      }

      if (!mlDetections) {
        throw lastError || new Error("YOLO detector failed");
      }

      results.mlComponents = {
        detections: mlDetections.detections.slice(0, 50),
        summary: mlDetections.summary,
        imageSize: mlDetections.imageSize,
        duration: mlDetections.duration,
      };
      results.executionTracking.ml.completed = Date.now();
      results.executionTracking.ml.duration =
        results.executionTracking.ml.completed -
        results.executionTracking.ml.started;

      console.log(
        `[ai-analysis] ✅ [TRACK] YOLO Detector completed in ${results.executionTracking.ml.duration}ms - detected ${mlDetections.summary.total} components:`,
        mlDetections.summary.byType
      );
      mlCircuit.consecutiveTimeouts = 0;
      return true;
    } catch (mlErr) {
      results.executionTracking.ml.completed = Date.now();
      results.executionTracking.ml.duration =
        results.executionTracking.ml.completed -
        results.executionTracking.ml.started;
      const isTimeout = results.executionTracking.ml.timeout;
      console.error(
        `[ai-analysis] ❌ [TRACK] YOLO Detector ${
          isTimeout ? "TIMED OUT" : "failed"
        } after ${results.executionTracking.ml.duration}ms:`,
        mlErr.message
      );
      results.errors.ml = mlErr.message;

      // Circuit breaker: if YOLO keeps timing out, skip it for a cooldown window
      if (String(mlErr.message || "").includes("timed out")) {
        mlCircuit.consecutiveTimeouts += 1;
        if (mlCircuit.consecutiveTimeouts >= ML_CIRCUIT_BREAKER_TIMEOUTS) {
          mlCircuit.openUntil = Date.now() + ML_CIRCUIT_BREAKER_COOLDOWN_MS;
          console.warn(
            `[ai-analysis] ⚠️ [DIAG] Opening YOLO circuit breaker for ${Math.ceil(
              ML_CIRCUIT_BREAKER_COOLDOWN_MS / 1000
            )}s after ${mlCircuit.consecutiveTimeouts} consecutive timeouts`
          );
        }
      }
      return false;
    }
  })();

  // Wait for all models to complete (or timeout)
  const [visionSuccess, colorSuccess, mlSuccess] = await Promise.allSettled([
    visionPromise,
    colorPromise,
    mlPromise,
  ]).then((settled) => [
    settled[0].status === "fulfilled" ? settled[0].value : false,
    settled[1].status === "fulfilled" ? settled[1].value : false,
    settled[2].status === "fulfilled" ? settled[2].value : false,
  ]);

  const parallelDuration = Date.now() - analysisStartTime;
  console.log(
    `[ai-analysis] 🚀 [DIAG] All models completed in parallel (total: ${parallelDuration}ms)`
  );

  const successCount = [visionSuccess, colorSuccess, mlSuccess].filter(
    Boolean
  ).length;

  // Log execution summary with timeout diagnostics
  const totalDuration = Date.now() - results.executionTracking.vision.started;
  console.log(
    `[ai-analysis] 📊 [DIAG] Execution Summary (Total: ${totalDuration}ms):`
  );
  console.log(
    `   Vision Analyzer: ${visionSuccess ? "✅" : "❌"} ${
      results.executionTracking.vision.duration || 0
    }ms${results.executionTracking.vision.timeout ? " ⏱️ TIMEOUT" : ""}`
  );
  console.log(
    `   Color Analyzer: ${colorSuccess ? "✅" : "❌"} ${
      results.executionTracking.color.duration || 0
    }ms${results.executionTracking.color.timeout ? " ⏱️ TIMEOUT" : ""}`
  );
  console.log(
    `   YOLO Detector: ${mlSuccess ? "✅" : "❌"} ${
      results.executionTracking.ml.duration || 0
    }ms${results.executionTracking.ml.timeout ? " ⏱️ TIMEOUT" : ""}`
  );

  // Identify which model is the bottleneck
  const durations = [
    {
      name: "Vision",
      duration: results.executionTracking.vision.duration || 0,
    },
    { name: "Color", duration: results.executionTracking.color.duration || 0 },
    { name: "YOLO", duration: results.executionTracking.ml.duration || 0 },
  ];
  const slowest = durations.reduce((max, curr) =>
    curr.duration > max.duration ? curr : max
  );
  if (slowest.duration > 10000) {
    console.warn(
      `[ai-analysis] ⚠️ [DIAG] Slowest model: ${slowest.name} (${slowest.duration}ms) - may be causing timeouts`
    );
  }

  console.log(
    `[ai-analysis] 📊 AI Analysis Summary: ${successCount}/3 models executed successfully`
  );

  return results;
}

app.post("/api/ai-analyze", async (req, res) => {
  // CRITICAL FIX: Add timeout to prevent hanging
  // Overall timeout is 70s (20s per model × 3 models + 10s buffer)
  // Per-model timeouts are handled in runAIAnalysis()
  const AI_ANALYSIS_TIMEOUT = 70000; // 70 seconds max (20s per model + buffer)
  const requestStartTime = Date.now();

  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      const elapsed = Date.now() - requestStartTime;
      console.error(
        `[ai-analyze] ⏱️ [DIAG] Overall request timeout after ${elapsed}ms (${AI_ANALYSIS_TIMEOUT}ms limit)`
      );
      console.error("[ai-analyze] [DIAG] This indicates:");
      console.error(
        "  - One or more AI models exceeded their 20s per-model timeout"
      );
      console.error("  - Check logs above for which specific model timed out");
      console.error("  - Vision Analyzer (OCR) timeout: 20s limit");
      console.error("  - Color Analyzer timeout: 20s limit");
      console.error("  - YOLO Detector timeout: 20s limit");
      res.status(504).json({
        ok: false,
        error: `AI analysis timeout - request took longer than ${AI_ANALYSIS_TIMEOUT}ms. Check server logs for which specific model timed out (each model has a 20s limit).`,
        timeout: true,
        elapsed: elapsed,
        diagnostic: "Check server logs for per-model timeout details",
      });
    }
  }, AI_ANALYSIS_TIMEOUT);

  try {
    const { screenshot } = req.body || {};
    if (!screenshot || typeof screenshot !== "string") {
      if (timeoutId) clearTimeout(timeoutId);
      return res
        .status(400)
        .json({ ok: false, error: "Missing screenshot (base64)" });
    }

    // Extract base64 data if it's a data URL
    let screenshotBase64 = screenshot;
    if (screenshot.startsWith("data:image")) {
      screenshotBase64 = screenshot.split(",")[1];
    }

    // CRITICAL: Basic validation of screenshot data
    if (!screenshotBase64 || screenshotBase64.length < 10) {
      if (timeoutId) clearTimeout(timeoutId);
      return res.status(400).json({
        ok: false,
        error: `Invalid screenshot data (length: ${
          screenshotBase64?.length || 0
        }). Image must be non-empty.`,
      });
    }

    const screenshotSizeKB = (screenshotBase64.length / 1024).toFixed(1);
    console.log(
      `[ai-analyze] Received AI analysis request (screenshot: ${screenshotSizeKB} KB)`
    );

    try {
      const { metadata } = req.body || {};
      const strictFidelity =
        metadata && metadata.strictFidelity !== undefined
          ? metadata.strictFidelity
          : true;

      const aiStartTime = Date.now();
      const aiResults = await runAIAnalysis(screenshotBase64, strictFidelity);
      const aiDuration = Date.now() - aiStartTime;

      if (timeoutId) clearTimeout(timeoutId); // CRITICAL: Clear timeout on success

      console.log(`[ai-analyze] ✅ Analysis completed in ${aiDuration}ms`);
      console.log(`[ai-analyze] Results:`, {
        ocr: !!aiResults.ocr,
        colorPalette: !!aiResults.colorPalette,
        mlComponents: !!aiResults.mlComponents,
        errors: Object.keys(aiResults.errors || {}).length,
      });

      // Log diagnostic information about model performance
      if (aiResults.executionTracking) {
        console.log(`[ai-analyze] [DIAG] Model execution times:`, {
          vision: `${aiResults.executionTracking.vision.duration || 0}ms${
            aiResults.executionTracking.vision.timeout ? " (TIMEOUT)" : ""
          }`,
          color: `${aiResults.executionTracking.color.duration || 0}ms${
            aiResults.executionTracking.color.timeout ? " (TIMEOUT)" : ""
          }`,
          ml: `${aiResults.executionTracking.ml.duration || 0}ms${
            aiResults.executionTracking.ml.timeout ? " (TIMEOUT)" : ""
          }`,
        });
      }

      if (!res.headersSent) {
        res.json({
          ok: true,
          results: aiResults,
          duration: aiDuration,
        });
      }
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId); // CRITICAL: Clear timeout on error
      const errorDuration = Date.now() - requestStartTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      console.error(
        `[ai-analyze] ❌ Analysis failed after ${errorDuration}ms:`,
        errorMessage
      );
      if (errorStack) {
        console.error("[ai-analyze] Stack trace:", errorStack);
      }

      // Provide more context about what failed
      let detailedError = errorMessage;
      if (errorMessage.includes("Vision analyzer")) {
        detailedError = `Vision Analyzer (OCR) failed: ${errorMessage}`;
      } else if (errorMessage.includes("Color analyzer")) {
        detailedError = `Color Analyzer failed: ${errorMessage}`;
      } else if (errorMessage.includes("YOLO")) {
        detailedError = `YOLO Detector failed: ${errorMessage}`;
      }

      if (!res.headersSent) {
        res.status(500).json({
          ok: false,
          error: detailedError,
          duration: errorDuration,
          stack:
            process.env.NODE_ENV === "development" ? errorStack : undefined,
        });
      }
    }
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[ai-analyze] ❌ Request processing error:", errorMessage);
    if (!res.headersSent) {
      res.status(500).json({
        ok: false,
        error: `Request processing failed: ${errorMessage}`,
      });
    }
  }
});

/**
 * Verification endpoint to test all AI models
 * Returns detailed status of each model
 */
app.get("/api/verify-models", async (req, res) => {
  console.log("[verify-models] Starting AI model verification...");

  const verification = {
    timestamp: new Date().toISOString(),
    models: {},
    overall: { allLoaded: false, allWorking: false, errors: [] },
  };

  // Test 1: Check if modules can be loaded
  console.log("[verify-models] Testing module loading...");

  const moduleTests = {
    visionAnalyzer: { loaded: false, error: null },
    colorAnalyzer: { loaded: false, error: null },
    typographyAnalyzer: { loaded: false, error: null },
    yoloDetector: { loaded: false, error: null },
  };

  try {
    if (createVisionAnalyzer && typeof createVisionAnalyzer === "function") {
      moduleTests.visionAnalyzer.loaded = true;
      verification.models.visionAnalyzer = {
        module: "loaded",
        functions: ["createVisionAnalyzer"],
      };
    } else {
      moduleTests.visionAnalyzer.error = "createVisionAnalyzer not available";
      verification.models.visionAnalyzer = {
        module: "failed",
        error: "createVisionAnalyzer not available",
      };
    }
  } catch (e) {
    moduleTests.visionAnalyzer.error = e.message;
    verification.models.visionAnalyzer = { module: "failed", error: e.message };
  }

  try {
    if (extractColorPalette && typeof extractColorPalette === "function") {
      moduleTests.colorAnalyzer.loaded = true;
      verification.models.colorAnalyzer = {
        module: "loaded",
        functions: ["extractColorPalette"],
      };
    } else {
      moduleTests.colorAnalyzer.error = "extractColorPalette not available";
      verification.models.colorAnalyzer = {
        module: "failed",
        error: "extractColorPalette not available",
      };
    }
  } catch (e) {
    moduleTests.colorAnalyzer.error = e.message;
    verification.models.colorAnalyzer = { module: "failed", error: e.message };
  }

  try {
    if (analyzeTypography && typeof analyzeTypography === "function") {
      moduleTests.typographyAnalyzer.loaded = true;
      verification.models.typographyAnalyzer = {
        module: "loaded",
        functions: ["analyzeTypography", "analyzeSpacing"],
      };
    } else {
      moduleTests.typographyAnalyzer.error = "analyzeTypography not available";
      verification.models.typographyAnalyzer = {
        module: "failed",
        error: "analyzeTypography not available",
      };
    }
  } catch (e) {
    moduleTests.typographyAnalyzer.error = e.message;
    verification.models.typographyAnalyzer = {
      module: "failed",
      error: e.message,
    };
  }

  try {
    if (yoloDetect && typeof yoloDetect === "function") {
      moduleTests.yoloDetector.loaded = true;
      verification.models.yoloDetector = {
        module: "loaded",
        functions: ["detectComponents"],
      };
    } else {
      moduleTests.yoloDetector.error = "yoloDetect not available";
      verification.models.yoloDetector = {
        module: "failed",
        error: "yoloDetect not available",
      };
    }
  } catch (e) {
    moduleTests.yoloDetector.error = e.message;
    verification.models.yoloDetector = { module: "failed", error: e.message };
  }

  verification.overall.allLoaded = Object.values(moduleTests).every(
    (m) => m.loaded
  );

  // Test 2: Check if models can execute (with a test image)
  console.log("[verify-models] Testing model execution...");

  // Create a minimal test image (1x1 pixel PNG)
  const testImageBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  if (verification.overall.allLoaded) {
    // Test Vision Analyzer (OCR)
    try {
      if (moduleTests.visionAnalyzer.loaded) {
        const visionAnalyzer = createVisionAnalyzer({ debug: false });
        const startTime = Date.now();
        const ocrResult = await visionAnalyzer.extractTextFromImage(
          Buffer.from(testImageBase64, "base64")
        );
        const duration = Date.now() - startTime;
        await visionAnalyzer.cleanup();

        verification.models.visionAnalyzer.execution = {
          status: "success",
          duration: duration,
          result: {
            wordCount: ocrResult.words?.length || 0,
            confidence: ocrResult.confidence || 0,
          },
        };
        console.log(
          `[verify-models] ✅ Vision Analyzer executed successfully (${duration}ms)`
        );
      }
    } catch (e) {
      verification.models.visionAnalyzer.execution = {
        status: "failed",
        error: e.message,
      };
      verification.overall.errors.push(`Vision Analyzer: ${e.message}`);
      console.error(
        `[verify-models] ❌ Vision Analyzer execution failed: ${e.message}`
      );
    }

    // Test Color Analyzer
    try {
      if (moduleTests.colorAnalyzer.loaded) {
        const startTime = Date.now();
        const colorResult = await extractColorPalette(
          Buffer.from(testImageBase64, "base64")
        );
        const duration = Date.now() - startTime;

        verification.models.colorAnalyzer.execution = {
          status: "success",
          duration: duration,
          result: {
            theme: colorResult.theme,
            colorCount: Object.keys(colorResult.palette || {}).length,
          },
        };
        console.log(
          `[verify-models] ✅ Color Analyzer executed successfully (${duration}ms)`
        );
      }
    } catch (e) {
      verification.models.colorAnalyzer.execution = {
        status: "failed",
        error: e.message,
      };
      verification.overall.errors.push(`Color Analyzer: ${e.message}`);
      console.error(
        `[verify-models] ❌ Color Analyzer execution failed: ${e.message}`
      );
    }

    // Test Typography Analyzer (doesn't need image, uses font data)
    try {
      if (moduleTests.typographyAnalyzer.loaded) {
        const testFontData = [
          {
            fontSize: 16,
            fontFamily: "Arial",
            fontWeight: 400,
            lineHeight: "24px",
            usage: 1,
          },
          {
            fontSize: 24,
            fontFamily: "Arial",
            fontWeight: 700,
            lineHeight: "32px",
            usage: 1,
          },
        ];
        const startTime = Date.now();
        const typoResult = analyzeTypography(testFontData);
        const duration = Date.now() - startTime;

        verification.models.typographyAnalyzer.execution = {
          status: "success",
          duration: duration,
          result: {
            scale: typoResult.typeScale?.scale || "unknown",
            baseSize: typoResult.typeScale?.baseSize || 0,
          },
        };
        console.log(
          `[verify-models] ✅ Typography Analyzer executed successfully (${duration}ms)`
        );
      }
    } catch (e) {
      verification.models.typographyAnalyzer.execution = {
        status: "failed",
        error: e.message,
      };
      verification.overall.errors.push(`Typography Analyzer: ${e.message}`);
      console.error(
        `[verify-models] ❌ Typography Analyzer execution failed: ${e.message}`
      );
    }

    // Test YOLO Detector (ML - may take longer to load model)
    try {
      if (moduleTests.yoloDetector.loaded) {
        const startTime = Date.now();
        const mlResult = await yoloDetect(
          Buffer.from(testImageBase64, "base64")
        );
        const duration = Date.now() - startTime;

        verification.models.yoloDetector.execution = {
          status: "success",
          duration: duration,
          result: {
            detections: mlResult.summary?.total || 0,
            byType: mlResult.summary?.byType || {},
          },
        };
        console.log(
          `[verify-models] ✅ YOLO Detector executed successfully (${duration}ms)`
        );
      }
    } catch (e) {
      verification.models.yoloDetector.execution = {
        status: "failed",
        error: e.message,
      };
      verification.overall.errors.push(`YOLO Detector: ${e.message}`);
      console.error(
        `[verify-models] ❌ YOLO Detector execution failed: ${e.message}`
      );
    }
  }

  // Determine overall status
  const allExecuted = Object.values(verification.models).every(
    (m) => m.execution && m.execution.status === "success"
  );
  verification.overall.allWorking =
    verification.overall.allLoaded && allExecuted;

  console.log(
    `[verify-models] Verification complete: ${
      verification.overall.allWorking
        ? "✅ ALL MODELS WORKING"
        : "⚠️ SOME MODELS FAILED"
    }`
  );

  res.json({
    ok: true,
    verification,
  });
});


// ============================================================================
// AX TREE SEMANTICS (CDP) — deterministic structure hints
// ============================================================================

const AX_LANDMARK_ROLES = new Set([
  "banner",
  "navigation",
  "main",
  "contentinfo",
  "complementary",
  "form",
  "search",
  "region",
]);

function axRoleString(axNode) {
  const role = axNode?.role;
  if (!role) return null;
  if (typeof role === "string") return role;
  if (typeof role.value === "string") return role.value;
  return null;
}

function axNameString(axNode) {
  const name = axNode?.name;
  if (!name) return null;
  if (typeof name === "string") return name;
  if (typeof name.value === "string") return name.value;
  return null;
}

function boundsFromQuad(quad) {
  if (!Array.isArray(quad) || quad.length < 8) return null;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (let i = 0; i < quad.length; i += 2) {
    const x = quad[i];
    const y = quad[i + 1];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;
  const width = Math.max(0, maxX - minX);
  const height = Math.max(0, maxY - minY);
  return { left: minX, top: minY, right: maxX, bottom: maxY, width, height };
}

async function getBoxForBackendNode(client, backendNodeId) {
  // Prefer the protocol's backendNodeId path when available.
  try {
    const model = await client.send("DOM.getBoxModel", { backendNodeId });
    const quad = model?.model?.border || model?.model?.content;
    const bounds = boundsFromQuad(quad);
    if (bounds && bounds.width > 0 && bounds.height > 0) return bounds;
  } catch {}

  // Fallback: resolve -> requestNode -> getBoxModel(nodeId)
  try {
    const resolved = await client.send("DOM.resolveNode", { backendNodeId });
    const objectId = resolved?.object?.objectId;
    if (!objectId) return null;
    const requested = await client.send("DOM.requestNode", { objectId });
    const nodeId = requested?.nodeId;
    if (!nodeId) return null;
    const model = await client.send("DOM.getBoxModel", { nodeId });
    const quad = model?.model?.border || model?.model?.content;
    const bounds = boundsFromQuad(quad);
    if (bounds && bounds.width > 0 && bounds.height > 0) return bounds;
  } catch {}

  return null;
}

async function captureAxSemantics(page, options = {}) {
  const maxLandmarks = Number.isFinite(options.maxAxLandmarks)
    ? options.maxAxLandmarks
    : 20;
  const includeFullTree = !!options.includeFullAxTree;
  const includeDomSnapshot = !!options.includeDomSnapshot;

  const client = await page.target().createCDPSession();
  try {
    await client.send("DOM.enable").catch(() => {});
    await client.send("Accessibility.enable").catch(() => {});

    let domSnapshotSummary = null;
    if (includeDomSnapshot) {
      try {
        const snapshot = await client.send("DOMSnapshot.captureSnapshot", {
          computedStyles: [
            "display",
            "position",
            "z-index",
            "overflow",
            "overflow-x",
            "overflow-y",
            "transform",
            "transform-origin",
          ],
          includePaintOrder: true,
          includeDOMRects: true,
        });
        domSnapshotSummary = {
          documentCount: snapshot?.documents?.length || 0,
          nodeCount:
            snapshot?.documents?.[0]?.nodes?.nodeName?.length ||
            snapshot?.documents?.[0]?.nodes?.backendNodeId?.length ||
            0,
        };
      } catch (e) {
        domSnapshotSummary = { error: e?.message || String(e) };
      }
    }

    const ax = await client.send("Accessibility.getFullAXTree");
    const axNodes = ax?.nodes || ax?.axNodes || ax?.tree || [];

    const landmarks = [];
    for (const node of axNodes) {
      if (landmarks.length >= maxLandmarks) break;
      if (node?.ignored) continue;

      const role = axRoleString(node);
      if (!role || !AX_LANDMARK_ROLES.has(role)) continue;

      const backendNodeId = node.backendDOMNodeId || node.backendNodeId;
      if (!backendNodeId || !Number.isFinite(backendNodeId)) continue;

      const bounds = await getBoxForBackendNode(client, backendNodeId);
      if (!bounds || bounds.width < 2 || bounds.height < 2) continue;

      landmarks.push({
        role,
        name: axNameString(node) || null,
        backendNodeId,
        bounds,
      });
    }

    // Stable ordering: top-to-bottom, then left-to-right.
    landmarks.sort((a, b) => {
      if (a.bounds.top !== b.bounds.top) return a.bounds.top - b.bounds.top;
      return a.bounds.left - b.bounds.left;
    });

    return {
      source: "cdp",
      capturedAt: new Date().toISOString(),
      axSummary: {
        totalNodes: Array.isArray(axNodes) ? axNodes.length : 0,
        landmarkCount: landmarks.length,
      },
      domSnapshotSummary,
      landmarks,
      ...(includeFullTree ? { axNodes } : {}),
    };
  } finally {
    try {
      await client.detach();
    } catch {}
  }
}

function findFirstNodeByTag(root, tag) {
  const target = String(tag || "").toLowerCase();
  if (!root) return null;
  const stack = [root];
  while (stack.length) {
    const n = stack.pop();
    if ((n.htmlTag || "").toLowerCase() === target) return n;
    if (Array.isArray(n.children)) {
      for (let i = n.children.length - 1; i >= 0; i--)
        stack.push(n.children[i]);
    }
  }
  return null;
}

function computeCenter(node) {
  const box = node?.absoluteLayout;
  if (!box) return null;
  const cx = (box.left + box.right) / 2;
  const cy = (box.top + box.bottom) / 2;
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
  return { cx, cy };
}

function contains(bounds, point) {
  return (
    point.cx >= bounds.left &&
    point.cx <= bounds.right &&
    point.cy >= bounds.top &&
    point.cy <= bounds.bottom
  );
}

function upsertLayoutRelatives(node, parentAbs) {
  if (!node?.layout || !node?.absoluteLayout) return;
  node.layout.relativeX = node.absoluteLayout.left - parentAbs.left;
  node.layout.relativeY = node.absoluteLayout.top - parentAbs.top;
}

function applyAxLandmarkFramesToSchema(schema, semantics) {
  const landmarks = semantics?.landmarks;
  // Schema v2 uses 'root' (migration ensures tree→root conversion happened earlier)
  if (!schema?.root || !Array.isArray(landmarks) || landmarks.length === 0) {
    return;
  }

  // Anchor under <body> when available (matches how users think about page structure).
  const root = schema.root;
  const body = findFirstNodeByTag(root, "body") || root;
  const bodyAbs = body.absoluteLayout || {
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  };

  body.children = Array.isArray(body.children) ? body.children : [];

  const landmarkNodes = landmarks.map((lm, index) => {
    const id = `ax_landmark_${index}_${lm.role}`;
    const name =
      lm.name && String(lm.name).trim().length
        ? `${lm.role}: ${String(lm.name).trim().slice(0, 80)}`
        : lm.role;
    const abs = {
      left: lm.bounds.left,
      top: lm.bounds.top,
      right: lm.bounds.right,
      bottom: lm.bounds.bottom,
      width: lm.bounds.width,
      height: lm.bounds.height,
    };
    return {
      id,
      parentId: body.id || null,
      type: "FRAME",
      name,
      htmlTag: "ax-landmark",
      cssClasses: [],
      layout: {
        x: abs.left,
        y: abs.top,
        width: abs.width,
        height: abs.height,
        relativeX: abs.left - bodyAbs.left,
        relativeY: abs.top - bodyAbs.top,
      },
      absoluteLayout: abs,
      fills: [],
      strokes: [],
      effects: [],
      attributes: { axRole: lm.role, axName: lm.name || "" },
      children: [],
    };
  });

  // Insert landmark frames at the top for stable ordering.
  body.children = [...landmarkNodes, ...body.children];

  // Re-parent direct body children into landmark frames when their center falls within a landmark.
  // This preserves internal DOM structure while adding deterministic “sections”.
  const originalChildren = body.children.slice(landmarkNodes.length);
  const remaining = [];

  for (const child of originalChildren) {
    const center = computeCenter(child);
    if (!center) {
      remaining.push(child);
      continue;
    }

    // Pick the smallest landmark that contains the child center (more specific).
    let best = null;
    let bestArea = Infinity;
    for (const lmNode of landmarkNodes) {
      const b = lmNode.absoluteLayout;
      if (!b || !contains(b, center)) continue;
      const area = b.width * b.height;
      if (area < bestArea) {
        best = lmNode;
        bestArea = area;
      }
    }

    if (!best) {
      remaining.push(child);
      continue;
    }

    child.parentId = best.id;
    upsertLayoutRelatives(child, best.absoluteLayout);
    best.children.push(child);
  }

  // Replace the body children after landmark frames.
  body.children = [...landmarkNodes, ...remaining];
}

app.use((error, _req, res, next) => {
  if (error?.type === "entity.too.large") {
    console.warn("[handoff] payload rejected – exceeds limit %s", BODY_LIMIT);
    return res.status(413).json({
      ok: false,
      error: `Payload exceeds handoff limit (${BODY_LIMIT}). Increase HANDOFF_MAX_PAYLOAD or capture a smaller page.`,
    });
  }
  next(error);
});

let server;
function logStartup(proto) {
  console.log(`🚀 Handoff server running on ${proto}://${HOST}:${PORT}`);
  console.log(`  - Listening on host ${HOST}`);
  console.log(`  - Max payload: ${BODY_LIMIT / 1024 / 1024}MB`);
  console.log(`  - Max job size: ${MAX_JOB_SIZE_MB}MB`);
  console.log(`  - Auth: ${API_KEYS.length ? "API key required" : "DISABLED"}`);
  console.log("  - Endpoints:");
  console.log(`    - POST /api/jobs`);
  console.log(`    - GET  /api/jobs/next`);
  console.log(`    - GET  /api/jobs/:id`);
  console.log(`    - GET  /api/jobs/history`);
  console.log(`    - GET  /api/health`);
}

if (USE_TLS) {
  try {
    const key = fs.readFileSync(TLS_KEY_PATH);
    const cert = fs.readFileSync(TLS_CERT_PATH);
    server = https.createServer({ key, cert }, app).listen(PORT, HOST, () => {
      logStartup("https");
    });
  } catch (err) {
    console.error(`[handoff] Failed to start TLS server: ${err.message}`);
    process.exit(1);
  }
} else {
  server = app.listen(PORT, HOST, () => logStartup("http"));
}

// Handle any potential errors
server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`\n❌ Port ${PORT} is already in use.`);
    console.error(`   - If another instance is running, you can ignore this.`);
    console.error(
      `   - To restart, find and kill the process using port ${PORT}.`
    );
    console.error(
      `   - Or set a different port using HANDOFF_PORT environment variable.\n`
    );
    process.exit(1);
  } else {
    console.error("Server error:", error);
  }
});

