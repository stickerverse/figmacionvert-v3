#!/usr/bin/env node

/**
 * Test script to diagnose fill/color extraction issues
 */

const http = require("http");

const jobId = process.argv[2];
const port = 4411;

if (!jobId) {
  console.error("Usage: node test-fills-diagnostic.js <job-id>");
  process.exit(1);
}

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
        const job = response.job;
        const payload = job.payload || {};
        const schema =
          payload.tree || payload.schema?.tree || payload.schema || payload;

        if (!schema) {
          console.error("❌ No tree found");
          process.exit(1);
        }

        console.log("\n📊 Fill/Color Diagnostic Report\n");
        console.log("=".repeat(60));

        const stats = {
          totalNodes: 0,
          nodesWithFills: 0,
          nodesWithoutFills: 0,
          fillTypes: new Map(),
          nodesWithBackgroundColor: 0,
          nodesWithTransparentFills: 0,
          nodesWithSolidFills: 0,
          nodesWithImageFills: 0,
          nodesWithGradientFills: 0,
          nodesWithZeroOpacity: 0,
        };

        function analyzeNode(node, depth = 0) {
          if (!node) return;

          stats.totalNodes++;

          // Check for backgroundColor in style or data
          const hasBackgroundColor =
            (node.style && node.style.backgroundColor) ||
            node.backgroundColor ||
            node.fillColor;

          if (hasBackgroundColor) {
            stats.nodesWithBackgroundColor++;
          }

          // Analyze fills
          if (
            node.fills &&
            Array.isArray(node.fills) &&
            node.fills.length > 0
          ) {
            stats.nodesWithFills++;

            node.fills.forEach((fill) => {
              if (!fill) return;

              const fillType = fill.type || "UNKNOWN";
              stats.fillTypes.set(
                fillType,
                (stats.fillTypes.get(fillType) || 0) + 1
              );

              if (fillType === "SOLID") {
                stats.nodesWithSolidFills++;
                const opacity =
                  fill.opacity !== undefined
                    ? fill.opacity
                    : fill.color?.a ?? 1;
                if (opacity <= 0.001) {
                  stats.nodesWithZeroOpacity++;
                }
                if (opacity < 1 && opacity > 0.001) {
                  stats.nodesWithTransparentFills++;
                }
              } else if (fillType === "IMAGE") {
                stats.nodesWithImageFills++;
              } else if (fillType.includes("GRADIENT")) {
                stats.nodesWithGradientFills++;
              }
            });
          } else {
            stats.nodesWithoutFills++;

            // Log nodes that should have fills but don't
            if (hasBackgroundColor && depth < 5) {
              console.warn(
                `⚠️  Node ${node.id} (${
                  node.htmlTag || node.type
                }) has backgroundColor but no fills:`,
                {
                  backgroundColor:
                    node.style?.backgroundColor || node.backgroundColor,
                  depth,
                }
              );
            }
          }

          // Recurse children
          if (node.children && Array.isArray(node.children)) {
            node.children.forEach((child) => analyzeNode(child, depth + 1));
          }
        }

        analyzeNode(schema);

        console.log("\n📈 Statistics:");
        console.log(`   Total nodes: ${stats.totalNodes}`);
        console.log(
          `   ✅ Nodes with fills: ${stats.nodesWithFills} (${(
            (stats.nodesWithFills / stats.totalNodes) *
            100
          ).toFixed(1)}%)`
        );
        console.log(
          `   ❌ Nodes without fills: ${stats.nodesWithoutFills} (${(
            (stats.nodesWithoutFills / stats.totalNodes) *
            100
          ).toFixed(1)}%)`
        );
        console.log(
          `   🎨 Nodes with backgroundColor property: ${stats.nodesWithBackgroundColor}`
        );

        console.log("\n🎨 Fill Types:");
        const sortedTypes = Array.from(stats.fillTypes.entries()).sort(
          (a, b) => b[1] - a[1]
        );
        sortedTypes.forEach(([type, count]) => {
          console.log(`   ${type}: ${count}`);
        });

        console.log("\n📊 Fill Details:");
        console.log(`   Solid fills: ${stats.nodesWithSolidFills}`);
        console.log(`   Image fills: ${stats.nodesWithImageFills}`);
        console.log(`   Gradient fills: ${stats.nodesWithGradientFills}`);
        console.log(
          `   Transparent fills (0 < opacity < 1): ${stats.nodesWithTransparentFills}`
        );
        console.log(`   Zero-opacity fills: ${stats.nodesWithZeroOpacity}`);

        // Check for common issues
        console.log("\n🔍 Issue Detection:");
        const fillCoverage = (stats.nodesWithFills / stats.totalNodes) * 100;
        if (fillCoverage < 10) {
          console.warn(
            "   ⚠️  LOW FILL COVERAGE: Less than 10% of nodes have fills"
          );
          console.warn(
            "      This suggests fills are not being extracted properly"
          );
        }

        if (stats.nodesWithBackgroundColor > stats.nodesWithFills) {
          console.warn(
            `   ⚠️  MISMATCH: ${stats.nodesWithBackgroundColor} nodes have backgroundColor but only ${stats.nodesWithFills} have fills`
          );
          console.warn(
            "      This suggests backgroundColor is not being converted to fills"
          );
        }

        if (stats.nodesWithZeroOpacity > 0) {
          console.warn(
            `   ⚠️  ${stats.nodesWithZeroOpacity} nodes have zero-opacity fills (may be filtered out)`
          );
        }

        console.log("\n" + "=".repeat(60));
      } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
      }
    });
  })
  .on("error", (error) => {
    console.error(`❌ Request failed: ${error.message}`);
    process.exit(1);
  });
