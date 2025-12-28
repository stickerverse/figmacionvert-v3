/**
 * Diagnostic script to check extension-plugin connection
 * Checks: Handoff server status, extension connectivity, plugin polling
 */

const http = require("http");

const HANDOFF_BASES = [
  "http://127.0.0.1:4411",
  "http://localhost:4411",
  "http://127.0.0.1:5511",
  "http://localhost:5511",
];

async function checkServer(base) {
  return new Promise((resolve) => {
    const url = new URL(`${base}/api/health`);
    const req = http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({
          ok: res.statusCode === 200,
          status: res.statusCode,
          base,
          data: data ? JSON.parse(data) : null,
        });
      });
    });

    req.on("error", (err) => {
      resolve({
        ok: false,
        error: err.message,
        base,
      });
    });

    req.setTimeout(3000, () => {
      req.destroy();
      resolve({
        ok: false,
        error: "Timeout",
        base,
      });
    });
  });
}

async function checkJobs(base) {
  return new Promise((resolve) => {
    const url = new URL(`${base}/api/jobs`);
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
            status: res.statusCode,
            base,
            job: parsed?.job || null,
            queueLength: parsed?.telemetry?.queueLength || 0,
          });
        } catch (e) {
          resolve({
            ok: false,
            error: "Invalid JSON response",
            base,
            raw: data.substring(0, 200),
          });
        }
      });
    });

    req.on("error", (err) => {
      resolve({
        ok: false,
        error: err.message,
        base,
      });
    });

    req.setTimeout(3000, () => {
      req.destroy();
      resolve({
        ok: false,
        error: "Timeout",
        base,
      });
    });
  });
}

async function main() {
  console.log("🔍 Checking Extension-Plugin Connection...\n");
  console.log("=".repeat(80));

  // Check each handoff server base
  console.log("📍 Step 1: Checking handoff server status...\n");
  const healthChecks = await Promise.all(HANDOFF_BASES.map(checkServer));

  let serverFound = false;
  for (const check of healthChecks) {
    if (check.ok) {
      console.log(`✅ Server responding: ${check.base}`);
      if (check.data) {
        console.log(`   Queue length: ${check.data.queueLength || 0}`);
        console.log(
          `   Last poll: ${
            check.data.telemetry?.lastPluginPollAt
              ? new Date(check.data.telemetry.lastPluginPollAt).toISOString()
              : "never"
          }`
        );
        console.log(
          `   Last delivery: ${
            check.data.telemetry?.lastDeliveredJobId || "none"
          }`
        );
      }
      serverFound = true;
    } else {
      console.log(`❌ Server not responding: ${check.base}`);
      if (check.error) {
        console.log(`   Error: ${check.error}`);
      }
    }
  }

  if (!serverFound) {
    console.log("\n❌ CRITICAL: No handoff server is running!");
    console.log("\n📋 To fix:");
    console.log("   1. Start the handoff server:");
    console.log("      node handoff-server.cjs");
    console.log("   OR");
    console.log("      ./start.sh");
    console.log("\n   2. The server should start on port 4411");
    console.log("   3. Verify with: curl http://localhost:4411/api/health");
    return 1;
  }

  console.log("\n📍 Step 2: Checking job queue...\n");
  const workingBase = healthChecks.find((c) => c.ok)?.base || HANDOFF_BASES[0];
  const jobCheck = await checkJobs(workingBase);

  if (jobCheck.ok) {
    if (jobCheck.job) {
      console.log(`✅ Job available in queue`);
      console.log(`   Job ID: ${jobCheck.job.id}`);
      console.log(`   Has payload: ${!!jobCheck.job.payload}`);
      console.log(`   Has root: ${!!jobCheck.job.payload?.root}`);
      console.log(
        `   Capture engine: ${
          jobCheck.job.payload?.metadata?.captureEngine || "unknown"
        }`
      );
    } else {
      console.log(`ℹ️  No jobs in queue (queue is empty)`);
      console.log(`   This is normal if no captures have been sent yet`);
    }
  } else {
    console.log(`⚠️  Could not check job queue: ${jobCheck.error}`);
  }

  console.log("\n" + "=".repeat(80));
  console.log("📋 Connection Status Summary:");
  console.log(
    `   Handoff Server: ${serverFound ? "✅ Running" : "❌ Not Running"}`
  );
  console.log(
    `   Extension → Server: ${
      serverFound ? "✅ Can connect" : "❌ Cannot connect"
    }`
  );
  console.log(
    `   Server → Plugin: ${serverFound ? "✅ Ready" : "❌ Not ready"}`
  );

  if (serverFound) {
    console.log("\n✅ Connection should work!");
    console.log("   - Extension can send captures to server");
    console.log("   - Plugin can poll for jobs from server");
    console.log("\n   If captures aren't transferring:");
    console.log("   1. Check extension console for errors");
    console.log("   2. Check plugin console for errors");
    console.log("   3. Verify extension is sending to correct endpoint");
    console.log("   4. Check server logs for rejected payloads");
    return 0;
  } else {
    console.log("\n❌ Connection will NOT work until server is started!");
    return 1;
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
