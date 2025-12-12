#!/usr/bin/env node

/**
 * Test script to identify which nodes are missing absoluteLayout
 */

const http = require("http");

const jobId = process.argv[2] || "f27de736-dc0a-4364-9b5f-2f641c4013c8";
const port = 4411;

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

        const missingNodes = [];
        const nodeTypes = new Map();

        function traverse(node, depth = 0, path = []) {
          if (!node) return;

          if (!node.absoluteLayout) {
            missingNodes.push({
              id: node.id,
              type: node.type,
              htmlTag: node.htmlTag,
              name: node.name,
              depth: depth,
              path: path.join(" > "),
            });

            const key = `${node.type || "UNKNOWN"}-${node.htmlTag || "none"}`;
            nodeTypes.set(key, (nodeTypes.get(key) || 0) + 1);
          }

          if (node.children && Array.isArray(node.children)) {
            node.children.forEach((child) => {
              traverse(child, depth + 1, [...path, node.id || "root"]);
            });
          }
        }

        traverse(schema);

        console.log(`\n📊 Missing absoluteLayout Analysis:\n`);
        console.log(`Total missing: ${missingNodes.length}\n`);

        console.log("By Type/HTML Tag:");
        const sorted = Array.from(nodeTypes.entries()).sort(
          (a, b) => b[1] - a[1]
        );
        sorted.slice(0, 20).forEach(([key, count]) => {
          console.log(`  ${key}: ${count}`);
        });

        console.log("\nSample missing nodes (first 10):");
        missingNodes.slice(0, 10).forEach((node) => {
          console.log(
            `  - ${node.type}/${node.htmlTag} (${node.name}) - depth: ${node.depth}`
          );
        });
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
