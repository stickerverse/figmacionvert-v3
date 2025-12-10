// capture-service/src/puppeteer-worker.ts
import puppeteer, { Browser } from "puppeteer";
import {
  getNextQueuedJob,
  updateJobStatus,
  attachSchemaToJob,
} from "./job-store";
import { WebToFigmaSchema } from "../../shared/schema";
import { runFullCapturePipelineInPage } from "./run-full-capture-in-page";

let browser: Browser | null = null;
let running = false;

async function ensureBrowser(): Promise<Browser> {
  if (browser && browser.isConnected()) return browser;
  console.log("[worker] Launching Puppeteer browser...");
  browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: null,
    protocolTimeout: 600000,
  });
  console.log("[worker] Browser launched");
  return browser;
}

export async function startPuppeteerWorker(): Promise<void> {
  if (running) {
    console.log("[worker] Already running");
    return;
  }
  running = true;
  console.log("[worker] Puppeteer worker started");

  while (running) {
    const job = getNextQueuedJob();
    if (!job) {
      await delay(500);
      continue;
    }

    console.log(`[worker] Processing job ${job.id} for ${job.url}`);

    try {
      updateJobStatus(job.id, { state: "processing" });
      const browser = await ensureBrowser();
      const page = await browser.newPage();

      // Set viewport
      await page.setViewport({
        width: job.viewport.width,
        height: job.viewport.height,
        deviceScaleFactor: job.viewport.deviceScaleFactor ?? 1,
      });

      // Set user agent
      await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
      );

      // Navigate to page
      console.log(`[worker] Navigating to ${job.url}`);
      await page.goto(job.url, { waitUntil: "networkidle2", timeout: 60000 });

      // Run full capture pipeline
      console.log("[worker] Running capture pipeline...");
      const schema: WebToFigmaSchema = await runFullCapturePipelineInPage(
        page,
        job.url,
        job.viewport,
        job.source
      );

      // Attach schema to job
      attachSchemaToJob(job.id, schema);
      console.log(
        `[worker] Job ${job.id} complete with ${
          schema.meta.diagnostics?.nodeCount || 0
        } nodes`
      );

      await page.close();
    } catch (err: any) {
      console.error(`[worker] Job ${job.id} failed:`, err.message);
      updateJobStatus(job.id, {
        state: "failed",
        reason: String(err?.message ?? err),
      });
    }
  }
}

export async function stopPuppeteerWorker(): Promise<void> {
  console.log("[worker] Stopping Puppeteer worker...");
  running = false;
  if (browser) {
    await browser.close();
    browser = null;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Process a single job immediately (for direct API calls)
export async function processJobNow(
  jobId: string
): Promise<WebToFigmaSchema | null> {
  const { getJob } = await import("./job-store");
  const job = getJob(jobId);
  if (!job) return null;

  try {
    updateJobStatus(job.id, { state: "processing" });
    const browser = await ensureBrowser();
    const page = await browser.newPage();

    await page.setViewport({
      width: job.viewport.width,
      height: job.viewport.height,
      deviceScaleFactor: job.viewport.deviceScaleFactor ?? 1,
    });

    await page.goto(job.url, { waitUntil: "networkidle2", timeout: 60000 });

    const schema = await runFullCapturePipelineInPage(
      page,
      job.url,
      job.viewport,
      job.source
    );
    attachSchemaToJob(job.id, schema);

    await page.close();
    return schema;
  } catch (err: any) {
    updateJobStatus(job.id, { state: "failed", reason: err.message });
    return null;
  }
}
