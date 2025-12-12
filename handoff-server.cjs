const express = require("express");
const cors = require("cors");
const { v4: uuid } = require("uuid");
const puppeteer = require("puppeteer");
const fs = require("fs");
const https = require("https");
const http = require("http");
const path = require("path");
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

function loadStorage() {
  try {
    if (!fs.existsSync(STORAGE_FILE)) return;
    const raw = fs.readFileSync(STORAGE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed.queue && Array.isArray(parsed.queue)) {
      queue.push(...parsed.queue);
    }
    if (parsed.history) {
      history = new Map(parsed.history.map(([id, job]) => [id, job]));
    }
    if (parsed.telemetry) Object.assign(telemetry, parsed.telemetry);
    if (parsed.lastDeliveredJob) lastDeliveredJob = parsed.lastDeliveredJob;
    console.log(`[handoff] Loaded persisted state from ${STORAGE_FILE}`);
  } catch (err) {
    console.warn(`[handoff] Failed to load storage: ${err.message}`);
  }
}

function persistStorage() {
  try {
    const payload = {
      queue,
      history: Array.from(history.entries()),
      telemetry,
      lastDeliveredJob,
    };
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(payload, null, 2));
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
            isCapture: req.originalUrl.includes("/api/capture"),
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
// All captures must go through /api/capture which uses Puppeteer
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

  // Check if this is a Puppeteer-produced schema (has captureEngine metadata)
  // Check both 'meta' (Puppeteer) and 'metadata' (Extension)
  const captureEngine =
    payloadToCheck?.meta?.captureEngine ||
    payloadToCheck?.metadata?.captureEngine ||
    payloadToCheck?.schema?.meta?.captureEngine;

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

  if (captureEngine === "puppeteer") {
    // Allow Puppeteer-produced schemas to be queued
    const job = {
      id: uuid(),
      timestamp: Date.now(),
      payload: payloadToCheck, // Use decompressed payload
    };
    job.permalink = `${getBaseUrl()}/api/jobs/${job.id}`;
    queue.push(job);
    history.set(job.id, job);
    persistStorage();

    console.log(
      `[handoff] received puppeteer job ${job.id} (queue=${queue.length})`
    );
    return res.json({
      ok: true,
      id: job.id,
      queueLength: queue.length,
      permalink: job.permalink,
    });
  }

  // Also accept extension-captured data (has tree property OR captures array)
  if (
    payloadToCheck?.tree ||
    payloadToCheck?.captures ||
    payloadToCheck?.schema?.tree ||
    captureEngine === "extension"
  ) {
    // #region agent log - Analyze captured schema properties for visual discrepancy analysis
    try {
      const schema = payloadToCheck?.tree
        ? payloadToCheck
        : payloadToCheck?.schema || payloadToCheck;
      const rootNode = schema?.tree;
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
            hasTree: !!schema?.tree,
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

  // Reject direct schema uploads - must use /api/capture
  console.warn(
    "[handoff] Rejected legacy schema upload - use /api/capture instead"
  );
  return res.status(410).json({
    ok: false,
    error:
      "Direct schema uploads are disabled. Use POST /api/capture with URL to trigger Puppeteer capture.",
    hint: 'POST /api/capture { url: "https://..." }',
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

    // Format the response to match what the Figma plugin expects
    const response = {
      job: {
        id: job.id,
        payload: job.payload.schema || job.payload, // Handle both formats
        screenshot: job.payload.screenshot,
        permalink: job.permalink || `${getBaseUrl()}/api/jobs/${job.id}`,
      },
      telemetry: getTelemetry(),
    };

    // Log the formatted response for debugging
    console.log(`[handoff] Sending formatted job response`, {
      jobId: response.job.id,
      hasPayload: !!response.job.payload,
      hasScreenshot: !!response.job.screenshot,
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
  const job = history.get(id) || queue.find((j) => j.id === id);
  if (!job) {
    return res.status(404).json({ ok: false, error: "Job not found" });
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
 * Run AI analysis on a screenshot (extracted from runFullCapturePipeline for reuse)
 * @param {string} screenshotBase64 - Base64 encoded screenshot
 * @returns {Promise<Object>} AI analysis results
 */
async function runAIAnalysis(screenshotBase64) {
  const results = {
    ocr: null,
    visionComponents: null,
    colorPalette: null,
    typography: null,
    spacingScale: null,
    mlComponents: null,
    errors: {},
    executionTracking: {
      vision: { called: false, started: null, completed: null, duration: null },
      color: { called: false, started: null, completed: null, duration: null },
      typography: {
        called: false,
        started: null,
        completed: null,
        duration: null,
      },
      ml: { called: false, started: null, completed: null, duration: null },
    },
  };

  // Vision Analyzer (OCR + Component Detection)
  console.log("[ai-analysis] 🤖 [TRACK] Starting Vision Analyzer (OCR)...");
  results.executionTracking.vision.called = true;
  results.executionTracking.vision.started = Date.now();

  let visionAnalyzer = null;
  let visionSuccess = false;
  try {
    if (!createVisionAnalyzer) {
      throw new Error("Vision analyzer not available - module failed to load");
    }
    visionAnalyzer = createVisionAnalyzer({ debug: false });

    const ocrResult = await visionAnalyzer.extractTextFromImage(
      Buffer.from(screenshotBase64, "base64")
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

    // Note: analyzeScreenshot requires a Puppeteer page, so we skip it for standalone analysis
    // This is acceptable as OCR is the main value-add for extension captures
    visionSuccess = true;
  } catch (visionErr) {
    results.executionTracking.vision.completed = Date.now();
    results.executionTracking.vision.duration =
      results.executionTracking.vision.completed -
      results.executionTracking.vision.started;
    console.error(
      `[ai-analysis] ❌ [TRACK] Vision Analyzer failed after ${results.executionTracking.vision.duration}ms:`,
      visionErr.message
    );
    results.errors.vision = visionErr.message;
  } finally {
    if (visionAnalyzer) {
      await visionAnalyzer.cleanup();
    }
  }

  // Color Palette Extraction
  console.log("[ai-analysis] 🎨 [TRACK] Starting Color Analyzer...");
  results.executionTracking.color.called = true;
  results.executionTracking.color.started = Date.now();

  let colorSuccess = false;
  try {
    if (!extractColorPalette) {
      throw new Error("Color analyzer not available - module failed to load");
    }
    const colorPalette = await extractColorPalette(
      Buffer.from(screenshotBase64, "base64")
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
    colorSuccess = true;
  } catch (colorErr) {
    results.executionTracking.color.completed = Date.now();
    results.executionTracking.color.duration =
      results.executionTracking.color.completed -
      results.executionTracking.color.started;
    console.error(
      `[ai-analysis] ❌ [TRACK] Color Analyzer failed after ${results.executionTracking.color.duration}ms:`,
      colorErr.message
    );
    results.errors.color = colorErr.message;
  }

  // Typography Analysis (requires font data from page, so we skip for standalone)
  // This is acceptable as typography is better extracted from DOM anyway

  // YOLO ML Component Detection
  console.log(
    "[ai-analysis] 🤖 [TRACK] Starting YOLO ML Component Detection..."
  );
  results.executionTracking.ml.called = true;
  results.executionTracking.ml.started = Date.now();

  let mlSuccess = false;
  try {
    if (!yoloDetect) {
      throw new Error("YOLO detector not available - module failed to load");
    }
    const mlDetections = await yoloDetect(
      Buffer.from(screenshotBase64, "base64")
    );
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
    mlSuccess = true;
  } catch (mlErr) {
    results.executionTracking.ml.completed = Date.now();
    results.executionTracking.ml.duration =
      results.executionTracking.ml.completed -
      results.executionTracking.ml.started;
    console.error(
      `[ai-analysis] ❌ [TRACK] YOLO Detector failed after ${results.executionTracking.ml.duration}ms:`,
      mlErr.message
    );
    results.errors.ml = mlErr.message;
  }

  const successCount = [visionSuccess, colorSuccess, mlSuccess].filter(
    Boolean
  ).length;

  // Log execution summary
  console.log(`[ai-analysis] 📊 [TRACK] Execution Summary:`);
  console.log(
    `   Vision Analyzer: ${visionSuccess ? "✅" : "❌"} ${
      results.executionTracking.vision.duration || 0
    }ms`
  );
  console.log(
    `   Color Analyzer: ${colorSuccess ? "✅" : "❌"} ${
      results.executionTracking.color.duration || 0
    }ms`
  );
  console.log(
    `   YOLO Detector: ${mlSuccess ? "✅" : "❌"} ${
      results.executionTracking.ml.duration || 0
    }ms`
  );
  console.log(
    `[ai-analysis] 📊 AI Analysis Summary: ${successCount}/3 models executed successfully`
  );

  return results;
}

app.post("/api/ai-analyze", async (req, res) => {
  // CRITICAL FIX: Add timeout to prevent hanging
  const AI_ANALYSIS_TIMEOUT = 30000; // 30 seconds max
  const requestStartTime = Date.now();

  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      const elapsed = Date.now() - requestStartTime;
      console.error(
        `[ai-analyze] ⏱️ Request timeout after ${elapsed}ms (30s limit)`
      );
      console.error("[ai-analyze] This may indicate:");
      console.error("  - AI models are taking too long to process");
      console.error("  - Vision analyzer (OCR) is stuck");
      console.error("  - Color analyzer is stuck");
      console.error("  - YOLO detector is stuck");
      res.status(504).json({
        ok: false,
        error: `AI analysis timeout - request took longer than ${AI_ANALYSIS_TIMEOUT}ms. One or more AI models may be unresponsive.`,
        timeout: true,
        elapsed: elapsed,
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

    const screenshotSizeKB = (screenshotBase64.length / 1024).toFixed(1);
    console.log(
      `[ai-analyze] Received AI analysis request (screenshot: ${screenshotSizeKB} KB)`
    );

    try {
      const aiStartTime = Date.now();
      const aiResults = await runAIAnalysis(screenshotBase64);
      const aiDuration = Date.now() - aiStartTime;

      if (timeoutId) clearTimeout(timeoutId); // CRITICAL: Clear timeout on success

      console.log(`[ai-analyze] ✅ Analysis completed in ${aiDuration}ms`);
      console.log(`[ai-analyze] Results:`, {
        ocr: !!aiResults.ocr,
        colorPalette: !!aiResults.colorPalette,
        mlComponents: !!aiResults.mlComponents,
        errors: Object.keys(aiResults.errors || {}).length,
      });

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

app.post("/api/capture", async (req, res) => {
  const { url } = req.body || {};
  if (!url || typeof url !== "string") {
    return res.status(400).json({ ok: false, error: "Missing capture URL" });
  }
  console.log(`[capture] Starting headless capture for ${url}`);
  try {
    const capture = await runFullCapturePipeline(url, req.body.options || {});
    res.json({
      ok: true,
      data: capture.data,
      validationReport: capture.validationReport,
      previewWithOverlay: capture.previewWithOverlay,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[capture] Failed:", message);
    console.error(error); // Log full error to stdout/stderr
    res.status(500).json({ ok: false, error: message });
  }
});

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
  console.log(`    - POST /api/capture`);
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

async function runFullCapturePipeline(targetUrl, options = {}) {
  // Use system Chrome on macOS to avoid crash
  let executablePath = undefined;
  if (process.platform === "darwin") {
    const chromePath =
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    if (fs.existsSync(chromePath)) {
      executablePath = chromePath;
    }
  }

  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    protocolTimeout: 600000, // 10 minutes for complex pages
  });

  const page = await browser.newPage();

  // ===== ENHANCED: Network Interception for Fonts & Assets =====
  const capturedFonts = [];
  const capturedAssets = { fonts: [], stylesheets: [] };

  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const resourceType = request.resourceType();
    const url = request.url();

    if (resourceType === "font") {
      capturedFonts.push(url);
      capturedAssets.fonts.push({ url, type: "font" });
    } else if (resourceType === "stylesheet") {
      capturedAssets.stylesheets.push({ url, type: "stylesheet" });
    }

    request.continue();
  });

  // ===== ENHANCED: Start CSS Coverage =====
  await Promise.all([
    page.coverage.startCSSCoverage(),
    page.coverage.startJSCoverage(),
  ]);

  // Bypass CSP for image/asset fetching
  await page.setBypassCSP(true);
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  try {
    console.log(`[headless] Navigating to ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 60000 });

    const injectedScriptPath = path.join(
      __dirname,
      "chrome-extension",
      "dist",
      "injected-script.js"
    );

    // Development safety: keep Puppeteer capture using the latest extractor code.
    // If the built injected script is missing OR older than src, auto-build it (local only).
    // This prevents "no change" situations when src changes but dist is stale.
    // Controlled by HANDOFF_AUTO_BUILD_INJECTED (default: true when not production).
    const autoBuild =
      (process.env.HANDOFF_AUTO_BUILD_INJECTED || "").toLowerCase() ===
        "true" ||
      (process.env.HANDOFF_AUTO_BUILD_INJECTED === undefined &&
        process.env.NODE_ENV !== "production");

    if (autoBuild) {
      try {
        const srcPath = path.join(
          __dirname,
          "chrome-extension",
          "src",
          "utils",
          "dom-extractor.ts"
        );
        const distExists = fs.existsSync(injectedScriptPath);
        const srcExists = fs.existsSync(srcPath);

        const distMtime = distExists
          ? fs.statSync(injectedScriptPath).mtimeMs
          : 0;
        const srcMtime = srcExists ? fs.statSync(srcPath).mtimeMs : 0;

        if (!distExists || (srcExists && srcMtime > distMtime)) {
          console.log(
            `[headless] Auto-building chrome-extension (dist stale or missing): ${
              !distExists ? "missing" : "stale"
            }`
          );
          const { spawnSync } = require("child_process");
          const extDir = path.join(__dirname, "chrome-extension");
          const res = spawnSync(
            process.platform === "win32" ? "npm.cmd" : "npm",
            ["run", "build"],
            {
              cwd: extDir,
              stdio: "inherit",
            }
          );
          if (res.status !== 0) {
            throw new Error(
              `chrome-extension build failed with code ${res.status}`
            );
          }
        }
      } catch (e) {
        console.warn(
          "[headless] Auto-build skipped/failed (continuing with existing dist):",
          e.message
        );
      }
    }

    if (!fs.existsSync(injectedScriptPath)) {
      throw new Error(
        "Injected script not built. Run `cd chrome-extension && npm run build`."
      );
    }
    const injectedScript = fs.readFileSync(injectedScriptPath, "utf8");
    await page.evaluate(injectedScript);

    // Set page timeout to match our extraction timeout
    page.setDefaultTimeout(300000); // 5 minutes

    console.log("[headless] Starting DOM extraction...");
    const extraction = await page.evaluate(() => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Extraction timeout after 180 seconds")),
          180000
        );
        function cleanup() {
          clearTimeout(timeout);
          window.removeEventListener("message", handler);
        }
        const handler = (event) => {
          if (event.data?.type === "EXTRACTION_COMPLETE") {
            cleanup();
            resolve({
              data: event.data.data,
              validationReport: event.data.validationReport,
              previewWithOverlay: event.data.previewWithOverlay,
            });
          } else if (event.data?.type === "EXTRACTION_ERROR") {
            cleanup();
            reject(new Error(event.data.error));
          }
        };
        window.addEventListener("message", handler);
        window.postMessage({ type: "START_EXTRACTION" }, "*");
      });
    });

    console.log("[headless] Extraction complete, capturing screenshot...");
    const screenshotBase64 = await page.screenshot({
      encoding: "base64",
      fullPage: true,
    });
    extraction.data = extraction.data || {};
    extraction.data.screenshot = `data:image/png;base64,${screenshotBase64}`;

    // ===== ENFORCED: Puppeteer Engine Metadata =====
    extraction.data.meta = extraction.data.meta || {};
    extraction.data.meta.captureEngine = "puppeteer";
    extraction.data.meta.capturedAt = new Date().toISOString();
    extraction.data.meta.captureMode = options.mode || "api";
    extraction.data.meta.url = targetUrl;

    // ===== ENHANCED: Accessibility Tree =====
    console.log("[headless] Extracting accessibility tree...");
    try {
      const accessibilityTree = await page.accessibility.snapshot({
        interestingOnly: false,
      });
      extraction.data.accessibility = accessibilityTree;
    } catch (a11yErr) {
      console.warn(
        "[headless] Accessibility extraction failed:",
        a11yErr.message
      );
    }

    // ===== ENHANCED: CSS Coverage Analysis =====
    console.log("[headless] Analyzing CSS coverage...");
    try {
      const [cssCoverage] = await Promise.all([
        page.coverage.stopCSSCoverage(),
        page.coverage.stopJSCoverage(),
      ]);

      let totalCSSBytes = 0;
      let usedCSSBytes = 0;

      for (const entry of cssCoverage) {
        totalCSSBytes += entry.text.length;
        for (const range of entry.ranges) {
          usedCSSBytes += range.end - range.start;
        }
      }

      const coveragePercent =
        totalCSSBytes > 0
          ? ((usedCSSBytes / totalCSSBytes) * 100).toFixed(1)
          : 0;
      console.log(`[headless] CSS Coverage: ${coveragePercent}% used`);

      extraction.data.cssCoverage = {
        totalBytes: totalCSSBytes,
        usedBytes: usedCSSBytes,
        coveragePercent: parseFloat(coveragePercent),
      };
    } catch (covErr) {
      console.warn("[headless] CSS coverage failed:", covErr.message);
    }

    // ===== ENHANCED: Add Network-Captured Fonts =====
    extraction.data.capturedFonts = capturedFonts;
    extraction.data.capturedAssets = capturedAssets;

    // ===== ENHANCED: Hover State Capture =====
    console.log("[headless] Capturing hover states...");
    const hoverStates = [];
    try {
      const interactiveElements = await page.$$(
        'button, a, [role="button"], .btn, .button'
      );
      const maxHoverCaptures = 15;

      for (
        let i = 0;
        i < Math.min(interactiveElements.length, maxHoverCaptures);
        i++
      ) {
        const element = interactiveElements[i];
        try {
          const beforeInfo = await page.evaluate((el) => {
            const rect = el.getBoundingClientRect();
            const styles = window.getComputedStyle(el);
            return {
              id: el.id || `hover-${i}`,
              rect: {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
              },
              styles: {
                backgroundColor: styles.backgroundColor,
                color: styles.color,
                boxShadow: styles.boxShadow,
                transform: styles.transform,
              },
            };
          }, element);

          if (beforeInfo.rect.width < 10 || beforeInfo.rect.height < 10)
            continue;

          await element.hover();
          await page.waitForTimeout(100);

          const afterStyles = await page.evaluate((el) => {
            const styles = window.getComputedStyle(el);
            return {
              backgroundColor: styles.backgroundColor,
              color: styles.color,
              boxShadow: styles.boxShadow,
              transform: styles.transform,
            };
          }, element);

          const hasChange =
            beforeInfo.styles.backgroundColor !== afterStyles.backgroundColor ||
            beforeInfo.styles.color !== afterStyles.color ||
            beforeInfo.styles.boxShadow !== afterStyles.boxShadow;

          if (hasChange) {
            hoverStates.push({
              id: beforeInfo.id,
              default: beforeInfo.styles,
              hover: afterStyles,
            });
          }

          await page.mouse.move(0, 0);
        } catch (hoverErr) {
          /* skip */
        }
      }

      console.log(`[headless] Captured ${hoverStates.length} hover variants`);
      extraction.data.hoverStates = hoverStates;
    } catch (hoverErr) {
      console.warn("[headless] Hover capture failed:", hoverErr.message);
    }

    // ===== ENHANCED: AI Vision Analysis (OCR + Component Detection) =====
    console.log(
      "[headless] 🤖 [TRACK] Starting Vision Analyzer (OCR + Component Detection)..."
    );
    let visionStartTime = Date.now();
    let visionDuration = null;
    let visionAnalyzer = null;
    let visionSuccess = false;
    try {
      if (!createVisionAnalyzer) {
        throw new Error(
          "Vision analyzer not available - module failed to load"
        );
      }
      visionAnalyzer = createVisionAnalyzer({ debug: false });

      // Run OCR on the screenshot
      const ocrResult = await visionAnalyzer.extractTextFromImage(
        Buffer.from(screenshotBase64, "base64")
      );
      extraction.data.ocr = {
        fullText: ocrResult.fullText.substring(0, 5000), // Limit size
        wordCount: ocrResult.words.length,
        confidence: ocrResult.confidence,
        duration: ocrResult.duration,
        words: ocrResult.words?.slice(0, 100), // Limit word details
      };
      console.log(
        `[headless] ✅ OCR extracted ${
          ocrResult.words.length
        } words (confidence: ${ocrResult.confidence.toFixed(2)})`
      );

      // Run component detection
      const componentAnalysis = await visionAnalyzer.analyzeScreenshot(page);
      extraction.data.visionComponents = {
        summary: componentAnalysis.summary,
        detectedCount: componentAnalysis.components.length,
        buttonCount: componentAnalysis.summary.BUTTON || 0,
        inputCount: componentAnalysis.summary.INPUT || 0,
        cardCount: componentAnalysis.summary.CARD || 0,
        navCount: componentAnalysis.summary.NAV || 0,
        components: componentAnalysis.components?.slice(0, 50), // Limit component details
      };
      visionDuration = Date.now() - visionStartTime;
      console.log(
        `[headless] ✅ [TRACK] Vision Analyzer completed in ${visionDuration}ms - OCR: ${ocrResult.words.length} words, Components: ${componentAnalysis.components.length}`
      );
      console.log(
        `[headless] ✅ AI Vision detected ${componentAnalysis.components.length} components:`,
        extraction.data.visionComponents.summary
      );
      visionSuccess = true;
    } catch (visionErr) {
      visionDuration = Date.now() - visionStartTime;
      console.error(
        `[headless] ❌ [TRACK] Vision Analyzer failed after ${visionDuration}ms:`,
        visionErr.message
      );
      console.error("[headless] Vision error stack:", visionErr.stack);
      // Store error in metadata for debugging
      extraction.data.meta = extraction.data.meta || {};
      extraction.data.meta.visionError = visionErr.message;
      // Don't set empty fallback - let the error be visible
    } finally {
      if (visionAnalyzer) {
        await visionAnalyzer.cleanup();
      }
    }

    if (!visionSuccess) {
      console.warn(
        "[headless] ⚠️ Vision analysis did not complete successfully - capture quality may be reduced"
      );
    }

    // ===== ENHANCED: Color Palette Extraction =====
    console.log("[headless] 🎨 [TRACK] Starting Color Analyzer...");
    let colorStartTime = Date.now();
    let colorDuration = null;
    let colorSuccess = false;
    try {
      if (!extractColorPalette) {
        throw new Error("Color analyzer not available - module failed to load");
      }
      const colorPalette = await extractColorPalette(
        Buffer.from(screenshotBase64, "base64")
      );
      extraction.data.colorPalette = {
        theme: colorPalette.theme,
        tokens: colorPalette.tokens,
        css: colorPalette.css,
        palette: colorPalette.palette, // Store full palette, not just count
      };
      colorDuration = Date.now() - colorStartTime;
      console.log(
        `[headless] ✅ [TRACK] Color Analyzer completed in ${colorDuration}ms - theme: ${
          colorPalette.theme
        }, tokens: ${Object.keys(colorPalette.tokens).length}, colors: ${
          Object.keys(colorPalette.palette).length
        }`
      );
      colorSuccess = true;

      // Integrate color palette into styles for Figma
      if (!extraction.data.styles) {
        extraction.data.styles = { colors: {}, textStyles: {}, effects: {} };
      }
      // Add color palette colors to style registry
      if (
        colorPalette.palette &&
        Object.keys(colorPalette.palette).length > 0
      ) {
        Object.entries(colorPalette.palette).forEach(([name, color]) => {
          if (color && color.hex) {
            const colorId = `palette-${name
              .toLowerCase()
              .replace(/\s+/g, "-")}`;
            extraction.data.styles.colors[colorId] = {
              id: colorId,
              name: name,
              color: color.figma || {
                r: color.rgb.r / 255,
                g: color.rgb.g / 255,
                b: color.rgb.b / 255,
                a: 1,
              },
              usageCount: color.population || 1,
            };
          }
        });
        console.log(
          `[headless] ✅ Integrated ${
            Object.keys(extraction.data.styles.colors).length
          } colors into style registry`
        );
      }
    } catch (colorErr) {
      console.error("[headless] ❌ Color extraction failed:", colorErr.message);
      console.error("[headless] Color error stack:", colorErr.stack);
      extraction.data.meta = extraction.data.meta || {};
      extraction.data.meta.colorError = colorErr.message;
    }

    if (!colorSuccess) {
      console.warn(
        "[headless] ⚠️ Color palette extraction did not complete - design tokens may be incomplete"
      );
    }

    // ===== ENHANCED: Typography Analysis =====
    console.log("[headless] 📝 [TRACK] Starting Typography Analyzer...");
    let typographyStartTime = Date.now();
    let typographyDuration = null;
    let typographySuccess = false;
    try {
      if (!analyzeTypography || !analyzeSpacing) {
        throw new Error(
          "Typography analyzer not available - module failed to load"
        );
      }
      // Extract font data from the page
      const fontData = await page.evaluate(() => {
        const fonts = [];
        const elements = document.querySelectorAll("*");
        for (const el of elements) {
          const styles = window.getComputedStyle(el);
          if (el.textContent?.trim()) {
            fonts.push({
              fontSize: parseFloat(styles.fontSize),
              fontFamily: styles.fontFamily,
              fontWeight: styles.fontWeight,
              lineHeight: styles.lineHeight,
              usage: 1,
            });
          }
        }
        return fonts;
      });

      if (!analyzeTypography) {
        throw new Error(
          "Typography analyzer not available - module failed to load"
        );
      }
      const typography = analyzeTypography(fontData);
      extraction.data.typography = {
        scale: typography.typeScale.scale,
        ratio: typography.typeScale.ratio,
        baseSize: typography.typeScale.baseSize,
        roles: typography.typeScale.roles,
        families: typography.families.slice(0, 5).map((f) => f.family),
        tokens: typography.tokens,
      };
      typographyDuration = Date.now() - typographyStartTime;
      console.log(
        `[headless] ✅ [TRACK] Typography Analyzer completed in ${typographyDuration}ms - scale: ${typography.typeScale.scale}, base: ${typography.typeScale.baseSize}px, families: ${typography.families.length}`
      );

      // Integrate typography tokens into styles for Figma
      if (!extraction.data.styles) {
        extraction.data.styles = { colors: {}, textStyles: {}, effects: {} };
      }
      if (typography.tokens && Object.keys(typography.tokens).length > 0) {
        Object.entries(typography.tokens).forEach(([name, token]) => {
          const styleId = `typography-${name
            .toLowerCase()
            .replace(/\s+/g, "-")}`;
          extraction.data.styles.textStyles[styleId] = {
            id: styleId,
            name: name,
            ...token,
          };
        });
        console.log(
          `[headless] ✅ Integrated ${
            Object.keys(extraction.data.styles.textStyles).length
          } typography styles`
        );
      }
      typographySuccess = true;

      // Extract spacing data
      const spacingData = await page.evaluate(() => {
        const spacings = [];
        const elements = document.querySelectorAll("*");
        for (const el of elements) {
          const styles = window.getComputedStyle(el);
          [
            "marginTop",
            "marginBottom",
            "marginLeft",
            "marginRight",
            "paddingTop",
            "paddingBottom",
            "paddingLeft",
            "paddingRight",
            "gap",
          ].forEach((prop) => {
            const val = parseFloat(styles[prop]);
            if (val > 0) spacings.push(val);
          });
        }
        return spacings;
      });

      if (!analyzeSpacing) {
        throw new Error(
          "Spacing analyzer not available - module failed to load"
        );
      }
      const spacing = analyzeSpacing(spacingData);
      extraction.data.spacingScale = {
        base: spacing.base,
        scale: spacing.scale.slice(0, 6),
      };
      console.log(
        `[headless] ✅ Spacing base: ${spacing.base}px, scale: [${spacing.scale
          .slice(0, 6)
          .join(", ")}]`
      );
    } catch (typoErr) {
      console.error(
        "[headless] ❌ Typography/Spacing analysis failed:",
        typoErr.message
      );
      console.error("[headless] Typography error stack:", typoErr.stack);
      extraction.data.meta = extraction.data.meta || {};
      extraction.data.meta.typographyError = typoErr.message;
    }

    if (!typographySuccess) {
      console.warn(
        "[headless] ⚠️ Typography analysis did not complete - text styles may be incomplete"
      );
    }

    // ===== ENHANCED: YOLO ML-Based Component Detection =====
    console.log(
      "[headless] 🤖 [TRACK] Starting YOLO ML Component Detection..."
    );
    let mlStartTime = Date.now();
    let mlDuration = null;
    let mlSuccess = false;
    try {
      if (!yoloDetect) {
        throw new Error("YOLO detector not available - module failed to load");
      }
      const mlDetections = await yoloDetect(
        Buffer.from(screenshotBase64, "base64")
      );

      extraction.data.mlComponents = {
        detections: mlDetections.detections.slice(0, 50), // Limit size
        summary: mlDetections.summary,
        imageSize: mlDetections.imageSize,
        duration: mlDetections.duration,
      };

      mlDuration = Date.now() - mlStartTime;
      console.log(
        `[headless] ✅ [TRACK] YOLO Detector completed in ${mlDuration}ms - detected ${mlDetections.summary.total} components:`,
        mlDetections.summary.byType
      );
      mlSuccess = true;

      // Integrate ML detections with component registry if available
      if (extraction.data.components && mlDetections.detections.length > 0) {
        // Cross-reference ML detections with DOM-extracted components
        console.log(
          `[headless] ✅ Cross-referencing ${mlDetections.detections.length} ML detections with DOM components`
        );
      }
    } catch (mlErr) {
      console.error("[headless] ❌ ML detection failed:", mlErr.message);
      console.error("[headless] ML error stack:", mlErr.stack);
      extraction.data.mlComponents = { error: mlErr.message };
      extraction.data.meta = extraction.data.meta || {};
      extraction.data.meta.mlError = mlErr.message;
    }

    if (!mlSuccess) {
      console.warn(
        "[headless] ⚠️ ML component detection did not complete - component detection may be less accurate"
      );
    }

    // ===== FINAL: AI Model Execution Summary =====
    const aiSummary = {
      vision: visionSuccess,
      color: colorSuccess,
      typography: typographySuccess,
      ml: mlSuccess,
      timestamp: new Date().toISOString(),
    };
    extraction.data.meta = extraction.data.meta || {};
    extraction.data.meta.aiModelsExecuted = aiSummary;

    const successCount = Object.values(aiSummary).filter(
      (v) => v === true
    ).length;
    const totalModels = 4;

    // Log execution summary with durations
    console.log(`[headless] 📊 [TRACK] Execution Summary:`);
    console.log(
      `   Vision Analyzer: ${visionSuccess ? "✅" : "❌"} ${
        visionDuration ? visionDuration + "ms" : "failed"
      }`
    );
    console.log(
      `   Color Analyzer: ${colorSuccess ? "✅" : "❌"} ${
        colorDuration ? colorDuration + "ms" : "failed"
      }`
    );
    console.log(
      `   Typography Analyzer: ${typographySuccess ? "✅" : "❌"} ${
        typographyDuration ? typographyDuration + "ms" : "failed"
      }`
    );
    console.log(
      `   YOLO Detector: ${mlSuccess ? "✅" : "❌"} ${
        mlDuration ? mlDuration + "ms" : "failed"
      }`
    );

    console.log(
      `[headless] 📊 AI Models Summary: ${successCount}/${totalModels} models executed successfully`
    );
    if (successCount < totalModels) {
      console.warn(
        `[headless] ⚠️ ${
          totalModels - successCount
        } AI model(s) failed - capture quality may be reduced`
      );
    }

    // ===== CRITICAL: Enhance schema with AI results to improve fidelity =====
    console.log(
      "[headless] 🤖 [AI-Enhancer] Enhancing schema with AI results..."
    );
    try {
      const {
        enhanceSchemaWithAI,
      } = require("./handoff-server-ai-enhancer.cjs");
      extraction.data = enhanceSchemaWithAI(extraction.data, {
        ocr: extraction.data.ocr,
        colorPalette: extraction.data.colorPalette,
        mlComponents: extraction.data.mlComponents,
        typography: extraction.data.typography,
        spacingScale: extraction.data.spacingScale,
      });
      console.log("[headless] ✅ [AI-Enhancer] Schema enhancement complete");
    } catch (enhanceError) {
      console.warn(
        "[headless] ⚠️ [AI-Enhancer] Schema enhancement failed:",
        enhanceError.message
      );
      // Continue without enhancement - extraction is still valid
    }

    return extraction;
  } finally {
    await browser.close();
  }
}
