const express = require('express');
const cors = require('cors');
const { v4: uuid } = require('uuid');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const HOST = process.env.HANDOFF_HOST || '0.0.0.0';
const PORT = process.env.HANDOFF_PORT ? Number(process.env.HANDOFF_PORT) : 5511;
const BODY_LIMIT = Number(process.env.HANDOFF_MAX_PAYLOAD_MB || '5000') * 1024 * 1024; // bytes  
const MAX_JOB_SIZE_MB = Number(process.env.HANDOFF_MAX_JOB_MB || '5000');

const app = express();
const queue = [];
const telemetry = {
  lastExtensionPingAt: null,
  lastExtensionTransferAt: null,
  lastPluginPollAt: null,
  lastPluginDeliveryAt: null,
  lastQueuedJobId: null,
  lastDeliveredJobId: null
};

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

// Submit a new job (support both /api/jobs and / for backward compatibility)
app.post(['/api/jobs', '/'], (req, res) => {
  if (!req.body) {
    return res.status(400).json({ ok: false, error: 'Missing request body' });
  }

  const sizeBytes = Buffer.byteLength(JSON.stringify(req.body), 'utf8');
  const sizeMB = sizeBytes / (1024 * 1024);
  if (sizeMB > MAX_JOB_SIZE_MB) {
    return res.status(413).json({
      ok: false,
      error: `Job payload is ${sizeMB.toFixed(2)} MB, which exceeds the limit of ${MAX_JOB_SIZE_MB} MB`
    });
  }

  const job = {
    id: uuid(),
    timestamp: Date.now(),
   payload: req.body
  };

  queue.push(job);
  const now = Date.now();
  telemetry.lastExtensionTransferAt = now;
  telemetry.lastExtensionPingAt = now;
  telemetry.lastQueuedJobId = job.id;
  console.log(`[handoff] received job ${job.id} (queue=${queue.length})`);
  res.json({ ok: true, id: job.id, queueLength: queue.length, telemetry: getTelemetry() });
});

// Get next job in queue (support both /api/jobs/next and /api/jobs for backward compatibility)
app.get(['/api/jobs/next', '/api/jobs'], (req, res) => {
  const job = queue.shift() || null;
  telemetry.lastPluginPollAt = Date.now();
  
  if (job) {
    telemetry.lastPluginDeliveryAt = Date.now();
    telemetry.lastDeliveredJobId = job.id;
    console.log(`[handoff] delivering job ${job.id} (queue=${queue.length})`);
    
    // Format the response to match what the Figma plugin expects
    const response = {
      job: {
        id: job.id,
        payload: job.payload.schema || job.payload, // Handle both formats
        screenshot: job.payload.screenshot
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
    // No jobs available
    res.status(204).end();
  }
});

// Capture a URL
app.post('/api/capture', async (req, res) => {
  const { url } = req.body || {};
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ ok: false, error: 'Missing capture URL' });
  }
  console.log(`[capture] Starting headless capture for ${url}`);
  try {
    const capture = await runHeadlessCapture(url);
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

const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Handoff server running on ${HOST}:${PORT}`);
  console.log(`  - Listening on host ${HOST}`);
  console.log(`  - Max payload: ${BODY_LIMIT / 1024 / 1024}MB`);
  console.log(`  - Max job size: ${MAX_JOB_SIZE_MB}MB`);
  console.log('  - Endpoints:');
  console.log(`    - POST /api/jobs`);
  console.log(`    - GET  /api/jobs/next`);
  console.log(`    - POST /api/capture`);
  console.log(`    - GET  /api/health`);
});

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


async function runHeadlessCapture(targetUrl) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  // Some sites (e.g., github.com) block cross-origin fetches via CSP, which breaks image downloads.
  // Bypass CSP only for this headless capture context so the injected script can fetch assets like ctfassets.
  await page.setBypassCSP(true);
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  try {
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    const injectedScriptPath = path.join(__dirname, 'chrome-extension', 'dist', 'injected-script.js');
    if (!fs.existsSync(injectedScriptPath)) {
      throw new Error('Injected script not built. Run `cd chrome-extension && npm run build`.');
    }
    const injectedScript = fs.readFileSync(injectedScriptPath, 'utf8');
    await page.evaluate(injectedScript);

    // Set page timeout to match our extraction timeout
    page.setDefaultTimeout(95000);
    
    const extraction = await page.evaluate(() => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Extraction timeout after 90 seconds')), 90000);
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

    const screenshotBase64 = await page.screenshot({ encoding: 'base64', fullPage: true });
    extraction.data = extraction.data || {};
    extraction.data.screenshot = `data:image/png;base64,${screenshotBase64}`;
    return extraction;
  } finally {
    await browser.close();
  }
}
