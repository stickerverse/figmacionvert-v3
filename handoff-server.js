const express = require('express');
const cors = require('cors');
const { v4: uuid } = require('uuid');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const PORT = process.env.HANDOFF_PORT ? Number(process.env.HANDOFF_PORT) : 4411;
const BODY_LIMIT = Number(process.env.HANDOFF_MAX_PAYLOAD_MB || '200') * 1024 * 1024; // bytes  
const MAX_JOB_SIZE_MB = Number(process.env.HANDOFF_MAX_JOB_MB || '200');

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

app.use(cors());
app.use(express.json({ limit: BODY_LIMIT }));

function getTelemetry() {
  return {
    ...telemetry,
    queueLength: queue.length
  };
}

app.get('/health', (req, res) => {
  if (req.query.source === 'extension') {
    telemetry.lastExtensionPingAt = Date.now();
  } else if (req.query.source === 'plugin') {
    telemetry.lastPluginPollAt = Date.now();
  }

  res.json({ ok: true, queueLength: queue.length, telemetry: getTelemetry() });
});

app.post('/jobs', (req, res) => {
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

app.get('/jobs/next', (_req, res) => {
  const job = queue.shift() || null;
  telemetry.lastPluginPollAt = Date.now();
  if (job) {
    telemetry.lastPluginDeliveryAt = Date.now();
    telemetry.lastDeliveredJobId = job.id;
    console.log(`[handoff] delivering job ${job.id} (queue=${queue.length})`);
  }
  res.json({ job, telemetry: getTelemetry() });
});

app.post('/capture', async (req, res) => {
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

app.listen(PORT, () => {
  console.log(`[handoff] server listening on http://127.0.0.1:${PORT}`);
});

async function runHeadlessCapture(targetUrl) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
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
