const express = require('express');
const cors = require('cors');
const { v4: uuid } = require('uuid');
const puppeteer = require('puppeteer');
const fs = require('fs');
const https = require('https');
const path = require('path');
const { createVisionAnalyzer } = require('./vision-analyzer');
const { extractColorPalette } = require('./color-analyzer');
const { analyzeTypography, analyzeSpacing } = require('./typography-analyzer');
const { detectComponents: yoloDetect } = require('./yolo-detector');

const HOST = process.env.HANDOFF_HOST || '0.0.0.0';
const PORT = process.env.HANDOFF_PORT ? Number(process.env.HANDOFF_PORT) : 4411;
const BODY_LIMIT = Number(process.env.HANDOFF_MAX_PAYLOAD_MB || '5000') * 1024 * 1024; // bytes  
const MAX_JOB_SIZE_MB = Number(process.env.HANDOFF_MAX_JOB_MB || '5000');
const STORAGE_FILE = process.env.HANDOFF_STORAGE_PATH || path.join(__dirname, 'handoff-jobs.json');
const API_KEYS = (process.env.HANDOFF_API_KEYS || '')
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean);
const TLS_KEY_PATH = process.env.HANDOFF_TLS_KEY || '';
const TLS_CERT_PATH = process.env.HANDOFF_TLS_CERT || '';
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
  lastDeliveredJobId: null
};

function loadStorage() {
  try {
    if (!fs.existsSync(STORAGE_FILE)) return;
    const raw = fs.readFileSync(STORAGE_FILE, 'utf8');
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
      lastDeliveredJob
    };
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(payload, null, 2));
  } catch (err) {
    console.warn(`[handoff] Failed to persist storage: ${err.message}`);
  }
}

function getBaseUrl() {
  const protocol = USE_TLS ? 'https' : 'http';
  const host = process.env.HANDOFF_PUBLIC_HOST || HOST || 'localhost';
  return `${protocol}://${host}:${PORT}`;
}

function requireAuth(req, res, next) {
  if (!API_KEYS.length) return next(); // auth disabled
  if (req.path === '/api/health') return next();
  const headerKey =
    req.headers['x-api-key'] ||
    (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (headerKey && API_KEYS.includes(headerKey)) {
    return next();
  }
  return res.status(401).json({ ok: false, error: 'Unauthorized' });
}

loadStorage();

// Basic request logger for diagnostics
app.use((req, _res, next) => {
  console.log(`[handoff] ${req.method} ${req.originalUrl}`);
  next();
});

app.use(cors({
  origin: '*', // Allow all origins for local development
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'cache-control'],
  credentials: true
}));

// Add Private Network Access headers manually
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  next();
});
app.use(express.json({ limit: BODY_LIMIT }));
app.use(requireAuth);

function getTelemetry() {
  return {
    ...telemetry,
    queueLength: queue.length
  };
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  if (req.query.source === 'extension') {
    telemetry.lastExtensionPingAt = Date.now();
  } else if (req.query.source === 'plugin') {
    telemetry.lastPluginPollAt = Date.now();
  }

  res.json({ ok: true, queueLength: queue.length, telemetry: getTelemetry() });
});

// Extension heartbeat endpoint
app.post('/api/extension/heartbeat', (req, res) => {
  const { extensionId, version } = req.body || {};
  telemetry.lastExtensionPingAt = Date.now();
  console.log(`[handoff] Heartbeat from extension ${version}`);
  res.json({ status: 'ok' });
});

// Remote logging endpoint
app.post('/api/log', (req, res) => {
  const { message, data } = req.body || {};
  console.log(`[EXT_LOG] ${message}`, data || '');
  res.json({ ok: true });
});

// Status endpoint for new plugin/extension logic
app.get('/api/status', (req, res) => {
  const now = Date.now();
  const isExtensionOnline = telemetry.lastExtensionPingAt && (now - telemetry.lastExtensionPingAt < 30000);
  
  res.json({
    server: 'ok',
    extension: isExtensionOnline ? 'online' : 'offline',
    telemetry: getTelemetry(),
    queueLength: queue.length
  });
});

// LEGACY: Submit a new job - NOW DISABLED
// All captures must go through /api/capture which uses Puppeteer
app.post(['/api/jobs', '/'], (req, res) => {
  // Check if this is a Puppeteer-produced schema (has captureEngine metadata)
  const captureEngine = req.body?.meta?.captureEngine || req.body?.schema?.meta?.captureEngine;
  
  if (captureEngine === 'puppeteer') {
    // Allow Puppeteer-produced schemas to be queued
    const job = {
      id: uuid(),
      timestamp: Date.now(),
      payload: req.body
    };
    job.permalink = `${getBaseUrl()}/api/jobs/${job.id}`;
    queue.push(job);
    history.set(job.id, job);
    persistStorage();
    
    console.log(`[handoff] received puppeteer job ${job.id} (queue=${queue.length})`);
    return res.json({
      ok: true,
      id: job.id,
      queueLength: queue.length,
      permalink: job.permalink
    });
  }

  // Reject direct schema uploads - must use /api/capture
  console.warn('[handoff] Rejected legacy schema upload - use /api/capture instead');
  return res.status(410).json({
    ok: false,
    error: 'Direct schema uploads are disabled. Use POST /api/capture with URL to trigger Puppeteer capture.',
    hint: 'POST /api/capture { url: "https://..." }'
  });
});


// Get next job in queue (support both /api/jobs/next and /api/jobs for backward compatibility)
app.get(['/api/jobs/next', '/api/jobs'], (req, res) => {
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
      deliveredAt: Date.now()
    };
    history.set(job.id, lastDeliveredJob);
    persistStorage();
    
    // Format the response to match what the Figma plugin expects
    const response = {
      job: {
        id: job.id,
        payload: job.payload.schema || job.payload, // Handle both formats
        screenshot: job.payload.screenshot,
        permalink: job.permalink || `${getBaseUrl()}/api/jobs/${job.id}`
      },
      telemetry: getTelemetry()
    };
    
    // Log the formatted response for debugging
    console.log(`[handoff] Sending formatted job response`, {
      jobId: response.job.id,
      hasPayload: !!response.job.payload,
      hasScreenshot: !!response.job.screenshot
    });
    
    res.json(response);
  } else {
    // No jobs available, but still return telemetry so the plugin knows the extension is connected
    res.json({
      job: null,
      telemetry: getTelemetry()
    });
  }
});

// Peek at the last delivered job (for diagnostics/testing)
app.get('/api/jobs/last', (req, res) => {
  if (!lastDeliveredJob) {
    return res.status(204).end();
  }

  res.json({
    job: {
      ...lastDeliveredJob,
      permalink: lastDeliveredJob.permalink || `${getBaseUrl()}/api/jobs/${lastDeliveredJob.id}`
    },
    telemetry: getTelemetry()
  });
});

// Retrieve a specific job by id (queue or history)
app.get('/api/jobs/:id', (req, res) => {
  const { id } = req.params;
  const job = history.get(id) || queue.find((j) => j.id === id);
  if (!job) {
    return res.status(404).json({ ok: false, error: 'Job not found' });
  }
  res.json({
    job: {
      ...job,
      permalink: job.permalink || `${getBaseUrl()}/api/jobs/${job.id}`
    },
    telemetry: getTelemetry()
  });
});

// List recent jobs (limited to last 100 for safety)
app.get('/api/jobs/history', (_req, res) => {
  const recent = Array.from(history.values())
    .sort((a, b) => (b.deliveredAt || b.timestamp || 0) - (a.deliveredAt || a.timestamp || 0))
    .slice(0, 100)
    .map((job) => ({
      id: job.id,
      timestamp: job.timestamp,
      deliveredAt: job.deliveredAt || null,
      permalink: job.permalink || `${getBaseUrl()}/api/jobs/${job.id}`,
      hasScreenshot: Boolean(job.screenshot || job.payload?.screenshot),
      size: job.payload ? JSON.stringify(job.payload).length : 0
    }));
  res.json({ jobs: recent, telemetry: getTelemetry() });
});

// Capture a URL
app.post('/api/capture', async (req, res) => {
  const { url } = req.body || {};
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ ok: false, error: 'Missing capture URL' });
  }
  console.log(`[capture] Starting headless capture for ${url}`);
  try {
    const capture = await runFullCapturePipeline(url, req.body.options || {});
    res.json({ ok: true, data: capture.data, validationReport: capture.validationReport, previewWithOverlay: capture.previewWithOverlay });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown headless capture error';
    console.error('[capture] Failed:', message);
    res.status(500).json({ ok: false, error: message });
  }
});

app.use((error, _req, res, next) => {
  if (error?.type === 'entity.too.large') {
    console.warn('[handoff] payload rejected – exceeds limit %s', BODY_LIMIT);
    return res.status(413).json({
      ok: false,
      error: `Payload exceeds handoff limit (${BODY_LIMIT}). Increase HANDOFF_MAX_PAYLOAD or capture a smaller page.`
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
  console.log(`  - Auth: ${API_KEYS.length ? 'API key required' : 'DISABLED'}`);
  console.log('  - Endpoints:');
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
      logStartup('https');
    });
  } catch (err) {
    console.error(`[handoff] Failed to start TLS server: ${err.message}`);
    process.exit(1);
  }
} else {
  server = app.listen(PORT, HOST, () => logStartup('http'));
}

// Handle any potential errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use.`);
    console.error(`   - If another instance is running, you can ignore this.`);
    console.error(`   - To restart, find and kill the process using port ${PORT}.`);
    console.error(`   - Or set a different port using HANDOFF_PORT environment variable.\n`);
    process.exit(1);
  } else {
    console.error('Server error:', error);
  }
});


async function runFullCapturePipeline(targetUrl, options = {}) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    protocolTimeout: 600000 // 10 minutes for complex pages
  });

  const page = await browser.newPage();
  
  // ===== ENHANCED: Network Interception for Fonts & Assets =====
  const capturedFonts = [];
  const capturedAssets = { fonts: [], stylesheets: [] };
  
  await page.setRequestInterception(true);
  page.on('request', request => {
    const resourceType = request.resourceType();
    const url = request.url();
    
    if (resourceType === 'font') {
      capturedFonts.push(url);
      capturedAssets.fonts.push({ url, type: 'font' });
    } else if (resourceType === 'stylesheet') {
      capturedAssets.stylesheets.push({ url, type: 'stylesheet' });
    }
    
    request.continue();
  });
  
  // ===== ENHANCED: Start CSS Coverage =====
  await Promise.all([
    page.coverage.startCSSCoverage(),
    page.coverage.startJSCoverage()
  ]);
  
  // Bypass CSP for image/asset fetching
  await page.setBypassCSP(true);
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  try {
    console.log(`[headless] Navigating to ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    const injectedScriptPath = path.join(__dirname, 'chrome-extension', 'dist', 'injected-script.js');
    if (!fs.existsSync(injectedScriptPath)) {
      throw new Error('Injected script not built. Run `cd chrome-extension && npm run build`.');
    }
    const injectedScript = fs.readFileSync(injectedScriptPath, 'utf8');
    await page.evaluate(injectedScript);

    // Set page timeout to match our extraction timeout
    page.setDefaultTimeout(300000); // 5 minutes
    
    console.log('[headless] Starting DOM extraction...');
    const extraction = await page.evaluate(() => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Extraction timeout after 180 seconds')), 180000);
        function cleanup() {
          clearTimeout(timeout);
          window.removeEventListener('message', handler);
        }
        const handler = (event) => {
          if (event.data?.type === 'EXTRACTION_COMPLETE') {
            cleanup();
            resolve({
              data: event.data.data,
              validationReport: event.data.validationReport,
              previewWithOverlay: event.data.previewWithOverlay
            });
          } else if (event.data?.type === 'EXTRACTION_ERROR') {
            cleanup();
            reject(new Error(event.data.error));
          }
        };
        window.addEventListener('message', handler);
        window.postMessage({ type: 'START_EXTRACTION' }, '*');
      });
    });
    
    console.log('[headless] Extraction complete, capturing screenshot...');
    const screenshotBase64 = await page.screenshot({ encoding: 'base64', fullPage: true });
    extraction.data = extraction.data || {};
    extraction.data.screenshot = `data:image/png;base64,${screenshotBase64}`;
    
    // ===== ENFORCED: Puppeteer Engine Metadata =====
    extraction.data.meta = extraction.data.meta || {};
    extraction.data.meta.captureEngine = 'puppeteer';
    extraction.data.meta.capturedAt = new Date().toISOString();
    extraction.data.meta.captureMode = options.mode || 'api';
    extraction.data.meta.url = targetUrl;
    
    // ===== ENHANCED: Accessibility Tree =====
    console.log('[headless] Extracting accessibility tree...');
    try {
      const accessibilityTree = await page.accessibility.snapshot({ interestingOnly: false });
      extraction.data.accessibility = accessibilityTree;
    } catch (a11yErr) {
      console.warn('[headless] Accessibility extraction failed:', a11yErr.message);
    }
    
    // ===== ENHANCED: CSS Coverage Analysis =====
    console.log('[headless] Analyzing CSS coverage...');
    try {
      const [cssCoverage] = await Promise.all([
        page.coverage.stopCSSCoverage(),
        page.coverage.stopJSCoverage()
      ]);
      
      let totalCSSBytes = 0;
      let usedCSSBytes = 0;
      
      for (const entry of cssCoverage) {
        totalCSSBytes += entry.text.length;
        for (const range of entry.ranges) {
          usedCSSBytes += range.end - range.start;
        }
      }
      
      const coveragePercent = totalCSSBytes > 0 ? ((usedCSSBytes / totalCSSBytes) * 100).toFixed(1) : 0;
      console.log(`[headless] CSS Coverage: ${coveragePercent}% used`);
      
      extraction.data.cssCoverage = {
        totalBytes: totalCSSBytes,
        usedBytes: usedCSSBytes,
        coveragePercent: parseFloat(coveragePercent)
      };
    } catch (covErr) {
      console.warn('[headless] CSS coverage failed:', covErr.message);
    }
    
    // ===== ENHANCED: Add Network-Captured Fonts =====
    extraction.data.capturedFonts = capturedFonts;
    extraction.data.capturedAssets = capturedAssets;
    
    // ===== ENHANCED: Hover State Capture =====
    console.log('[headless] Capturing hover states...');
    const hoverStates = [];
    try {
      const interactiveElements = await page.$$('button, a, [role="button"], .btn, .button');
      const maxHoverCaptures = 15;
      
      for (let i = 0; i < Math.min(interactiveElements.length, maxHoverCaptures); i++) {
        const element = interactiveElements[i];
        try {
          const beforeInfo = await page.evaluate((el) => {
            const rect = el.getBoundingClientRect();
            const styles = window.getComputedStyle(el);
            return {
              id: el.id || `hover-${i}`,
              rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
              styles: {
                backgroundColor: styles.backgroundColor,
                color: styles.color,
                boxShadow: styles.boxShadow,
                transform: styles.transform
              }
            };
          }, element);
          
          if (beforeInfo.rect.width < 10 || beforeInfo.rect.height < 10) continue;
          
          await element.hover();
          await page.waitForTimeout(100);
          
          const afterStyles = await page.evaluate((el) => {
            const styles = window.getComputedStyle(el);
            return {
              backgroundColor: styles.backgroundColor,
              color: styles.color,
              boxShadow: styles.boxShadow,
              transform: styles.transform
            };
          }, element);
          
          const hasChange = beforeInfo.styles.backgroundColor !== afterStyles.backgroundColor ||
                           beforeInfo.styles.color !== afterStyles.color ||
                           beforeInfo.styles.boxShadow !== afterStyles.boxShadow;
          
          if (hasChange) {
            hoverStates.push({ id: beforeInfo.id, default: beforeInfo.styles, hover: afterStyles });
          }
          
          await page.mouse.move(0, 0);
        } catch (hoverErr) { /* skip */ }
      }
      
      console.log(`[headless] Captured ${hoverStates.length} hover variants`);
      extraction.data.hoverStates = hoverStates;
    } catch (hoverErr) {
      console.warn('[headless] Hover capture failed:', hoverErr.message);
    }
    
    // ===== ENHANCED: AI Vision Analysis (OCR + Component Detection) =====
    console.log('[headless] Running AI vision analysis...');
    let visionAnalyzer = null;
    try {
      visionAnalyzer = createVisionAnalyzer({ debug: false });
      
      // Run OCR on the screenshot
      const ocrResult = await visionAnalyzer.extractTextFromImage(
        Buffer.from(screenshotBase64, 'base64')
      );
      extraction.data.ocr = {
        fullText: ocrResult.fullText.substring(0, 5000), // Limit size
        wordCount: ocrResult.words.length,
        confidence: ocrResult.confidence,
        duration: ocrResult.duration
      };
      console.log(`[headless] OCR extracted ${ocrResult.words.length} words`);
      
      // Run component detection
      const componentAnalysis = await visionAnalyzer.analyzeScreenshot(page);
      extraction.data.visionComponents = {
        summary: componentAnalysis.summary,
        detectedCount: componentAnalysis.components.length,
        buttonCount: componentAnalysis.summary.BUTTON || 0,
        inputCount: componentAnalysis.summary.INPUT || 0,
        cardCount: componentAnalysis.summary.CARD || 0,
        navCount: componentAnalysis.summary.NAV || 0
      };
      console.log('[headless] AI Vision:', extraction.data.visionComponents.summary);
      
    } catch (visionErr) {
      console.warn('[headless] Vision analysis failed:', visionErr.message);
    } finally {
      if (visionAnalyzer) {
        await visionAnalyzer.cleanup();
      }
    }
    
    // ===== ENHANCED: Color Palette Extraction =====
    console.log('[headless] Extracting color palette...');
    try {
      const colorPalette = await extractColorPalette(
        Buffer.from(screenshotBase64, 'base64')
      );
      extraction.data.colorPalette = {
        theme: colorPalette.theme,
        tokens: colorPalette.tokens,
        css: colorPalette.css,
        palette: Object.keys(colorPalette.palette).length
      };
      console.log(`[headless] Color theme: ${colorPalette.theme}, tokens: ${Object.keys(colorPalette.tokens).length}`);
    } catch (colorErr) {
      console.warn('[headless] Color extraction failed:', colorErr.message);
    }
    
    // ===== ENHANCED: Typography Analysis =====
    console.log('[headless] Analyzing typography...');
    try {
      // Extract font data from the page
      const fontData = await page.evaluate(() => {
        const fonts = [];
        const elements = document.querySelectorAll('*');
        for (const el of elements) {
          const styles = window.getComputedStyle(el);
          if (el.textContent?.trim()) {
            fonts.push({
              fontSize: parseFloat(styles.fontSize),
              fontFamily: styles.fontFamily,
              fontWeight: styles.fontWeight,
              lineHeight: styles.lineHeight,
              usage: 1
            });
          }
        }
        return fonts;
      });
      
      const typography = analyzeTypography(fontData);
      extraction.data.typography = {
        scale: typography.typeScale.scale,
        ratio: typography.typeScale.ratio,
        baseSize: typography.typeScale.baseSize,
        roles: typography.typeScale.roles,
        families: typography.families.slice(0, 5).map(f => f.family),
        tokens: typography.tokens
      };
      console.log(`[headless] Type scale: ${typography.typeScale.scale}, base: ${typography.typeScale.baseSize}px`);
      
      // Extract spacing data
      const spacingData = await page.evaluate(() => {
        const spacings = [];
        const elements = document.querySelectorAll('*');
        for (const el of elements) {
          const styles = window.getComputedStyle(el);
          ['marginTop', 'marginBottom', 'marginLeft', 'marginRight', 
           'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'gap'].forEach(prop => {
            const val = parseFloat(styles[prop]);
            if (val > 0) spacings.push(val);
          });
        }
        return spacings;
      });
      
      const spacing = analyzeSpacing(spacingData);
      extraction.data.spacingScale = {
        base: spacing.base,
        scale: spacing.scale.slice(0, 6)
      };
      console.log(`[headless] Spacing base: ${spacing.base}px`);
      
    } catch (typoErr) {
      console.warn('[headless] Typography analysis failed:', typoErr.message);
    }
    
    // ===== ENHANCED: YOLO ML-Based Component Detection =====
    console.log('[headless] Running ML component detection (YOLO/COCO-SSD)...');
    try {
      const mlDetections = await yoloDetect(
        Buffer.from(screenshotBase64, 'base64')
      );
      
      extraction.data.mlComponents = {
        detections: mlDetections.detections.slice(0, 50), // Limit size
        summary: mlDetections.summary,
        imageSize: mlDetections.imageSize,
        duration: mlDetections.duration
      };
      
      console.log(`[headless] ML detected ${mlDetections.summary.total} components:`, mlDetections.summary.byType);
      
    } catch (mlErr) {
      console.warn('[headless] ML detection failed:', mlErr.message);
      extraction.data.mlComponents = { error: mlErr.message };
    }
    
    return extraction;
  } finally {
    await browser.close();
  }
}
