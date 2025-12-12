#!/usr/bin/env node
/**
 * AI Models Verification Script
 *
 * Tests all AI models to verify they are:
 * 1. Installed correctly
 * 2. Can be loaded
 * 3. Can execute successfully
 *
 * Usage: node verify-models.js
 */

const http = require("http");

const HANDOFF_PORT = process.env.HANDOFF_PORT || 4411;
const HANDOFF_HOST = process.env.HANDOFF_HOST || "localhost";

function makeRequest(path, method = "GET", body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HANDOFF_HOST,
      port: HANDOFF_PORT,
      path: path,
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on("error", (e) => {
      reject(e);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function verifyModels() {
  console.log("╔════════════════════════════════════════════╗");
  console.log("║      AI Models Verification Script          ║");
  console.log("╚════════════════════════════════════════════╝");
  console.log("");

  // Check if server is running
  console.log(
    `🔍 Checking if handoff server is running on ${HANDOFF_HOST}:${HANDOFF_PORT}...`
  );
  try {
    const statusResponse = await makeRequest("/api/status");
    if (statusResponse.status === 200) {
      console.log("✅ Handoff server is running\n");
    } else {
      console.log(
        "⚠️  Handoff server responded with status:",
        statusResponse.status
      );
    }
  } catch (e) {
    console.error("❌ Cannot connect to handoff server:", e.message);
    console.error("   Make sure the server is running: npm start");
    process.exit(1);
  }

  // Run verification
  console.log("🤖 Verifying AI models...\n");
  try {
    const verifyResponse = await makeRequest("/api/verify-models");

    if (verifyResponse.status !== 200) {
      console.error("❌ Verification request failed:", verifyResponse.status);
      console.error("   Response:", verifyResponse.data);
      process.exit(1);
    }

    const verification = verifyResponse.data.verification;

    // Display results
    console.log("📊 Verification Results:\n");

    const models = [
      { key: "visionAnalyzer", name: "Vision Analyzer (OCR)", icon: "👁️" },
      { key: "colorAnalyzer", name: "Color Analyzer", icon: "🎨" },
      { key: "typographyAnalyzer", name: "Typography Analyzer", icon: "📝" },
      { key: "yoloDetector", name: "YOLO Detector (ML)", icon: "🤖" },
    ];

    models.forEach(({ key, name, icon }) => {
      const model = verification.models[key];
      if (!model) {
        console.log(`  ${icon} ${name}: ❌ NOT FOUND`);
        return;
      }

      const moduleStatus = model.module === "loaded" ? "✅" : "❌";
      const execStatus =
        model.execution?.status === "success"
          ? "✅"
          : model.execution
          ? "❌"
          : "⏭️";

      console.log(`  ${icon} ${name}:`);
      console.log(`     Module: ${moduleStatus} ${model.module}`);
      if (model.execution) {
        console.log(`     Execution: ${execStatus} ${model.execution.status}`);
        if (model.execution.duration) {
          console.log(`     Duration: ${model.execution.duration}ms`);
        }
        if (model.execution.error) {
          console.log(`     Error: ${model.execution.error}`);
        }
      } else {
        console.log(`     Execution: ⏭️  Not tested`);
      }
      console.log("");
    });

    // Overall status
    console.log("╔════════════════════════════════════════════╗");
    if (verification.overall.allWorking) {
      console.log("║     ✅ ALL MODELS WORKING CORRECTLY        ║");
    } else if (verification.overall.allLoaded) {
      console.log("║  ⚠️  MODELS LOADED BUT SOME FAILED         ║");
    } else {
      console.log("║     ❌ SOME MODELS FAILED TO LOAD          ║");
    }
    console.log("╚════════════════════════════════════════════╝");
    console.log("");

    if (verification.overall.errors.length > 0) {
      console.log("❌ Errors:");
      verification.overall.errors.forEach((error) => {
        console.log(`   - ${error}`);
      });
      console.log("");
    }

    // Summary
    const loadedCount = Object.values(verification.models).filter(
      (m) => m.module === "loaded"
    ).length;
    const workingCount = Object.values(verification.models).filter(
      (m) => m.execution?.status === "success"
    ).length;
    const totalCount = Object.keys(verification.models).length;

    console.log(`📈 Summary:`);
    console.log(`   Modules loaded: ${loadedCount}/${totalCount}`);
    console.log(`   Models working: ${workingCount}/${totalCount}`);
    console.log("");

    // Exit code
    if (verification.overall.allWorking) {
      console.log("✅ All models verified successfully!");
      process.exit(0);
    } else {
      console.log("⚠️  Some models failed verification");
      process.exit(1);
    }
  } catch (e) {
    console.error("❌ Verification failed:", e.message);
    process.exit(1);
  }
}

// Run verification
verifyModels().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
