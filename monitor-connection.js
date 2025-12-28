/**
 * Real-time monitor for extension-plugin connection
 * Watches server logs and job queue
 */

const http = require("http");
const fs = require("fs");

const HANDOFF_BASE = "http://127.0.0.1:4411";
const POLL_INTERVAL = 2000; // 2 seconds

let lastQueueLength = null;
let lastJobId = null;
let messageCount = 0;

async function checkStatus() {
  return new Promise((resolve) => {
    const url = new URL(`${HANDOFF_BASE}/api/health`);
    const req = http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          resolve({
            ok: res.statusCode === 200,
            data: data ? JSON.parse(data) : null,
          });
        } catch (e) {
          resolve({ ok: false, error: "Invalid JSON" });
        }
      });
    });

    req.on("error", (err) => {
      resolve({ ok: false, error: err.message });
    });

    req.setTimeout(3000, () => {
      req.destroy();
      resolve({ ok: false, error: "Timeout" });
    });
  });
}

async function checkJobs() {
  return new Promise((resolve) => {
    const url = new URL(`${HANDOFF_BASE}/api/jobs`);
    const req = http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({
            ok: res.statusCode === 200,
            job: parsed?.job || null,
            telemetry: parsed?.telemetry || null,
          });
        } catch (e) {
          resolve({ ok: false, error: "Invalid JSON" });
        }
      });
    });

    req.on("error", (err) => {
      resolve({ ok: false, error: err.message });
    });

    req.setTimeout(3000, () => {
      req.destroy();
      resolve({ ok: false, error: "Timeout" });
    });
  });
}

function formatTime(ms) {
  if (!ms) return "never";
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s ago`;
}

async function monitor() {
  console.log("🔍 Monitoring Extension-Plugin Connection");
  console.log("=".repeat(80));
  console.log(`📍 Server: ${HANDOFF_BASE}`);
  console.log(`⏱️  Polling every ${POLL_INTERVAL / 1000}s`);
  console.log("Press Ctrl+C to stop\n");

  setInterval(async () => {
    messageCount++;
    const timestamp = new Date().toISOString();

    // Check server health
    const health = await checkStatus();
    if (!health.ok) {
      console.log(`[${timestamp}] ❌ Server not responding: ${health.error}`);
      return;
    }

    // Check jobs
    const jobs = await checkJobs();
    if (!jobs.ok) {
      console.log(`[${timestamp}] ⚠️  Could not check jobs: ${jobs.error}`);
      return;
    }

    const telemetry = health.data?.telemetry || jobs.telemetry || {};
    const queueLength = health.data?.queueLength || 0;
    const hasJob = !!jobs.job;

    // Detect changes
    const queueChanged = queueLength !== lastQueueLength;
    const newJob = hasJob && jobs.job?.id !== lastJobId;

    if (queueChanged || newJob || messageCount % 10 === 0) {
      console.log(`\n[${timestamp}] 📊 Status Update:`);
      console.log(`   Queue length: ${queueLength}`);
      console.log(
        `   Last plugin poll: ${formatTime(telemetry.lastPluginPollAt)}`
      );
      console.log(
        `   Last extension transfer: ${formatTime(
          telemetry.lastExtensionTransferAt
        )}`
      );
      console.log(
        `   Last job delivery: ${formatTime(telemetry.lastDeliveredJobAt)}`
      );

      if (hasJob) {
        console.log(`\n   ✅ JOB AVAILABLE:`);
        console.log(`      Job ID: ${jobs.job.id}`);
        console.log(`      Has payload: ${!!jobs.job.payload}`);
        console.log(`      Has root: ${!!jobs.job.payload?.root}`);
        console.log(
          `      Capture engine: ${
            jobs.job.payload?.metadata?.captureEngine || "unknown"
          }`
        );
        lastJobId = jobs.job.id;
      } else if (queueLength > 0) {
        console.log(`   ⏳ ${queueLength} job(s) in queue (not yet delivered)`);
      } else {
        console.log(`   ℹ️  Queue is empty`);
      }

      if (newJob) {
        console.log(
          `\n   🎉 NEW JOB DETECTED! Plugin should pick this up on next poll.`
        );
      }
    }

    lastQueueLength = queueLength;
  }, POLL_INTERVAL);
}

// Initial check
console.log("🔍 Initial connection check...\n");
checkStatus().then((health) => {
  if (!health.ok) {
    console.error("❌ Server not running!");
    console.error("   Start it with: node handoff-server.cjs");
    process.exit(1);
  }
  console.log("✅ Server is running\n");
  monitor();
});

process.on("SIGINT", () => {
  console.log("\n\n👋 Monitoring stopped");
  process.exit(0);
});
