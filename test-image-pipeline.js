/**
 * Test script to run the full pipeline and diagnose image issues
 */

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const TEST_URL = process.argv[2] || "https://example.com";

async function runTest() {
  console.log("🚀 Starting Image Pipeline Test");
  console.log(`📍 Target URL: ${TEST_URL}`);
  console.log("");

  // Use system Chrome on macOS
  let executablePath = undefined;
  if (process.platform === "darwin") {
    const chromePath =
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    if (fs.existsSync(chromePath)) {
      executablePath = chromePath;
    }
  }

  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    protocolTimeout: 600000,
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  try {
    console.log("📸 Navigating to page...");
    await page.goto(TEST_URL, { waitUntil: "networkidle2", timeout: 60000 });

    // Load the injected script
    const injectedScriptPath = path.join(
      __dirname,
      "chrome-extension",
      "dist",
      "injected-script.js"
    );
    if (!fs.existsSync(injectedScriptPath)) {
      throw new Error(
        "Injected script not built. Run `cd chrome-extension && npm run build`."
      );
    }
    const injectedScript = fs.readFileSync(injectedScriptPath, "utf8");
    await page.evaluate(injectedScript);

    console.log("🔍 Starting extraction...");
    const extraction = await page.evaluate(() => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Extraction timeout")),
          180000
        );
        function cleanup() {
          clearTimeout(timeout);
          window.removeEventListener("message", handler);
        }
        const handler = (event) => {
          if (event.data?.type === "EXTRACTION_COMPLETE") {
            cleanup();
            resolve(event.data.data);
          } else if (event.data?.type === "EXTRACTION_ERROR") {
            cleanup();
            reject(new Error(event.data.error));
          }
        };
        window.addEventListener("message", handler);
        window.postMessage({ type: "START_EXTRACTION" }, "*");
      });
    });

    console.log("✅ Extraction complete!");
    console.log("");

    // Analyze image data
    console.log("📊 IMAGE ANALYSIS");
    console.log("================");

    const images = extraction.assets?.images || {};
    const imageCount = Object.keys(images).length;
    console.log(`Total images in assets: ${imageCount}`);
    console.log("");

    // Find all nodes with images
    const imageNodes = [];
    function findImageNodes(node, path = "") {
      const currentPath = path
        ? `${path} > ${node.name || node.id}`
        : node.name || node.id;

      if (node.type === "IMAGE" || node.imageHash || node.imageAssetId) {
        imageNodes.push({
          path: currentPath,
          node: {
            id: node.id,
            name: node.name,
            type: node.type,
            layout: node.layout,
            imageHash: node.imageHash || node.imageAssetId,
            fills: node.fills,
            objectFit: node.objectFit,
            scaleMode: node.fills?.[0]?.scaleMode,
            imageTransform: node.fills?.[0]?.imageTransform,
          },
        });
      }

      if (node.children) {
        node.children.forEach((child) => findImageNodes(child, currentPath));
      }
    }

    if (extraction.tree) {
      findImageNodes(extraction.tree);
    }

    console.log(`Nodes with images: ${imageNodes.length}`);
    console.log("");

    // Check each image node
    const issues = [];
    imageNodes.forEach((item, idx) => {
      const { node } = item;
      const hash = node.imageHash;
      const asset = images[hash];

      console.log(`\n🖼️  Image Node #${idx + 1}: ${node.name}`);
      console.log(`   Path: ${item.path}`);
      console.log(`   Hash: ${hash?.substring(0, 20)}...`);
      console.log(
        `   Node Layout: ${node.layout?.width}×${node.layout?.height}`
      );

      if (asset) {
        console.log(`   Asset Dimensions: ${asset.width}×${asset.height}`);
        console.log(`   Asset has data: ${!!asset.data}`);
        console.log(`   Asset URL: ${asset.url?.substring(0, 60)}...`);

        // Check for issues
        if (asset.width === 0 || asset.height === 0) {
          issues.push({
            node: node.name,
            issue: "Asset has zero dimensions",
            asset: asset,
          });
          console.log(`   ⚠️  ISSUE: Asset has zero dimensions!`);
        }

        if (!asset.data && !asset.base64) {
          issues.push({
            node: node.name,
            issue: "Asset missing image data",
            asset: asset,
          });
          console.log(`   ⚠️  ISSUE: Asset missing image data!`);
        }

        // Check aspect ratio mismatch
        if (
          asset.width > 0 &&
          asset.height > 0 &&
          node.layout?.width > 0 &&
          node.layout?.height > 0
        ) {
          const assetRatio = asset.width / asset.height;
          const nodeRatio = node.layout.width / node.layout.height;
          const ratioDiff = Math.abs(assetRatio - nodeRatio);

          if (ratioDiff > 0.1) {
            issues.push({
              node: node.name,
              issue: `Aspect ratio mismatch: asset ${assetRatio.toFixed(
                2
              )} vs node ${nodeRatio.toFixed(2)}`,
              asset: asset,
              nodeLayout: node.layout,
            });
            console.log(`   ⚠️  ISSUE: Aspect ratio mismatch!`);
            console.log(`      Asset ratio: ${assetRatio.toFixed(2)}`);
            console.log(`      Node ratio: ${nodeRatio.toFixed(2)}`);
          }
        }
      } else {
        issues.push({
          node: node.name,
          issue: "Asset not found in registry",
          hash: hash,
        });
        console.log(`   ⚠️  ISSUE: Asset not found in registry!`);
      }

      if (node.scaleMode) {
        console.log(`   Scale Mode: ${node.scaleMode}`);
      }
      if (node.imageTransform) {
        console.log(
          `   Image Transform: ${JSON.stringify(node.imageTransform)}`
        );
      }
    });

    console.log("\n");
    console.log("📋 SUMMARY");
    console.log("==========");
    console.log(`Total images: ${imageCount}`);
    console.log(`Image nodes: ${imageNodes.length}`);
    console.log(`Issues found: ${issues.length}`);

    if (issues.length > 0) {
      console.log("\n⚠️  ISSUES:");
      issues.forEach((issue, idx) => {
        console.log(`\n${idx + 1}. ${issue.node}: ${issue.issue}`);
        if (issue.asset) {
          console.log(`   Asset: ${issue.asset.width}×${issue.asset.height}`);
        }
      });
    }

    // Save detailed report
    const report = {
      url: TEST_URL,
      timestamp: new Date().toISOString(),
      stats: {
        totalImages: imageCount,
        imageNodes: imageNodes.length,
        issues: issues.length,
      },
      images: imageNodes.map((item) => ({
        path: item.path,
        node: item.node,
        asset: images[item.node.imageHash] || null,
      })),
      issues: issues,
    };

    const reportPath = path.join(__dirname, "image-pipeline-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    await browser.close();
    return report;
  } catch (error) {
    console.error("❌ Error:", error);
    await browser.close();
    throw error;
  }
}

runTest()
  .then((report) => {
    console.log("\n✅ Test complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
