#!/usr/bin/env node

/**
 * Test script to verify absoluteLayout is present in captured schema
 */

const http = require("http");

const jobId = process.argv[2] || "4795219d-56bf-4b2f-a65b-7b15acb450f3";
const port = 4411;

console.log(`🔍 Testing job: ${jobId}`);
console.log(`📡 Server: http://127.0.0.1:${port}\n`);

const url = `http://127.0.0.1:${port}/api/jobs/${jobId}`;

http
  .get(url, (res) => {
    let data = "";

    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      try {
        const response = JSON.parse(data);

        if (!response || !response.job) {
          console.error("❌ Invalid job response");
          console.error("Response keys:", Object.keys(response || {}));
          process.exit(1);
        }

        const job = response.job;
        const payload = job.payload || {};

        // Handle different payload structures
        const schema =
          payload.tree || payload.schema?.tree || payload.schema || payload;

        if (!schema) {
          console.error("❌ No tree found in payload");
          process.exit(1);
        }

        console.log("✅ Schema loaded successfully\n");

        // Test 1: Check if absoluteLayout exists
        let nodesWithAbsoluteLayout = 0;
        let nodesWithoutAbsoluteLayout = 0;
        let totalNodes = 0;

        function traverse(node, depth = 0) {
          if (!node) return;

          totalNodes++;

          if (node.absoluteLayout) {
            nodesWithAbsoluteLayout++;

            // Verify structure
            const required = ["left", "top", "width", "height"];
            const missing = required.filter(
              (key) => !(key in node.absoluteLayout)
            );

            if (missing.length > 0 && depth < 3) {
              console.warn(
                `⚠️  Node ${
                  node.id
                } missing absoluteLayout fields: ${missing.join(", ")}`
              );
            }
          } else {
            nodesWithoutAbsoluteLayout++;
            if (depth < 3) {
              console.warn(
                `⚠️  Node ${node.id} (${
                  node.htmlTag || node.type
                }) missing absoluteLayout`
              );
            }
          }

          // Traverse children
          if (node.children && Array.isArray(node.children)) {
            node.children.forEach((child) => traverse(child, depth + 1));
          }
        }

        traverse(schema);

        console.log("📊 Results:");
        console.log(`   Total nodes: ${totalNodes}`);
        console.log(
          `   ✅ With absoluteLayout: ${nodesWithAbsoluteLayout} (${(
            (nodesWithAbsoluteLayout / totalNodes) *
            100
          ).toFixed(1)}%)`
        );
        console.log(
          `   ❌ Without absoluteLayout: ${nodesWithoutAbsoluteLayout} (${(
            (nodesWithoutAbsoluteLayout / totalNodes) *
            100
          ).toFixed(1)}%)`
        );

        // Test 2: Check layout.x/y vs absoluteLayout consistency
        let inconsistentNodes = 0;
        let consistentNodes = 0;

        function checkConsistency(node, depth = 0) {
          if (!node) return;

          if (node.absoluteLayout && node.layout) {
            const absX = node.absoluteLayout.left;
            const layoutX = node.layout.x;
            const absY = node.absoluteLayout.top;
            const layoutY = node.layout.y;

            const xDiff = Math.abs(absX - layoutX);
            const yDiff = Math.abs(absY - layoutY);

            // Allow small floating point differences
            if (xDiff > 0.1 || yDiff > 0.1) {
              inconsistentNodes++;
              if (depth < 2) {
                console.warn(
                  `⚠️  Node ${node.id} coordinate mismatch: abs(${absX}, ${absY}) vs layout(${layoutX}, ${layoutY})`
                );
              }
            } else {
              consistentNodes++;
            }
          }

          if (node.children && Array.isArray(node.children)) {
            node.children.forEach((child) =>
              checkConsistency(child, depth + 1)
            );
          }
        }

        checkConsistency(schema);

        console.log("\n📐 Coordinate Consistency:");
        console.log(`   ✅ Consistent: ${consistentNodes}`);
        console.log(`   ⚠️  Inconsistent: ${inconsistentNodes}`);

        // Test 3: Check for timeout metadata
        if (schema.metadata || job.payload.metadata) {
          const metadata = schema.metadata || job.payload.metadata;
          if (metadata.extractionStatus === "partial") {
            console.log("\n⏱️  Timeout Recovery:");
            console.log(`   Status: ${metadata.extractionStatus}`);
            console.log(
              `   Extracted nodes: ${metadata.extractedNodes || "unknown"}`
            );
          }
        }

        // Summary
        console.log("\n" + "=".repeat(50));
        const coverage = (nodesWithAbsoluteLayout / totalNodes) * 100;

        if (coverage >= 99) {
          console.log("✅ PASS: absoluteLayout coverage is excellent!");
        } else if (coverage >= 95) {
          console.log(
            "⚠️  WARNING: absoluteLayout coverage is good but not perfect"
          );
        } else {
          console.log("❌ FAIL: absoluteLayout coverage is too low");
          process.exit(1);
        }
      } catch (error) {
        console.error("❌ Error parsing response:", error.message);
        console.error("Response:", data.substring(0, 500));
        process.exit(1);
      }
    });
  })
  .on("error", (error) => {
    console.error(`❌ Request failed: ${error.message}`);
    process.exit(1);
  });
