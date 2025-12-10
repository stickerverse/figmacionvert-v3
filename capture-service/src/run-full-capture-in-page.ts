// capture-service/src/run-full-capture-in-page.ts
import { Page } from "puppeteer";
import {
  WebToFigmaSchema,
  Viewport,
  Tokens,
  AnalyzedNode,
  CaptureSource,
} from "../../shared/schema";
import * as fs from "fs";
import * as path from "path";

/**
 * Runs the full capture pipeline inside Puppeteer.
 * This injects the existing dom-extractor and runs extraction.
 */
export async function runFullCapturePipelineInPage(
  page: Page,
  url: string,
  viewport: Viewport,
  source: CaptureSource = "extension"
): Promise<WebToFigmaSchema> {
  // Inject the existing injected-script.js which has the DOM extractor
  const injectedScriptPath = path.join(
    __dirname,
    "../../chrome-extension/dist/injected-script.js"
  );

  if (fs.existsSync(injectedScriptPath)) {
    const injectedScript = fs.readFileSync(injectedScriptPath, "utf8");
    await page.evaluate(injectedScript);
    console.log("[capture] Injected existing DOM extractor script");
  }

  // Run extraction via the injected script's message interface
  const extraction = await page.evaluate(() => {
    return new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Extraction timeout after 180s")),
        180000
      );

      function cleanup() {
        clearTimeout(timeout);
        window.removeEventListener("message", handler);
      }

      const handler = (event: MessageEvent) => {
        if (event.data?.type === "EXTRACTION_COMPLETE") {
          cleanup();
          resolve({
            data: event.data.data,
            validationReport: event.data.validationReport,
          });
        } else if (event.data?.type === "EXTRACTION_ERROR") {
          cleanup();
          reject(new Error(event.data.error));
        }
      };

      window.addEventListener("message", handler);
      window.postMessage({ type: "START_EXTRACTION" }, "*");
    });
  });

  // Extract tokens from the page
  const tokens = await extractTokensFromPage(page);

  // Convert extraction data to v2 schema format
  const schema: WebToFigmaSchema = {
    version: "v2",
    url,
    viewport,
    root: extraction.data?.tree || buildFallbackRoot(viewport),
    tokens,
    assets: extraction.data?.assets,
    meta: {
      capturedAt: new Date().toISOString(),
      captureEngine: "puppeteer",
      captureSource: source,
      diagnostics: {
        nodeCount: countNodes(extraction.data?.tree),
        frameCount: 1,
        componentCount: 0,
        autoLayoutFrameCount: 0,
      },
    },
  };

  return schema;
}

/**
 * Extract design tokens from the page
 */
async function extractTokensFromPage(page: Page): Promise<Tokens> {
  const rawTokens = await page.evaluate(() => {
    const colors: Array<{ id: string; name: string; value: string }> = [];
    const textStyles: Array<{
      id: string;
      name: string;
      fontFamily: string;
      fontSize: number;
      fontWeight: number;
      lineHeight: number;
    }> = [];
    const spacing: Array<{ id: string; name: string; value: number }> = [];

    // Extract unique colors from computed styles
    const colorSet = new Set<string>();
    const fontSet = new Set<string>();

    document.querySelectorAll("*").forEach((el, i) => {
      if (i > 500) return; // Limit for performance
      const styles = window.getComputedStyle(el);

      // Colors
      const bg = styles.backgroundColor;
      const fg = styles.color;
      if (bg && bg !== "rgba(0, 0, 0, 0)" && !colorSet.has(bg)) {
        colorSet.add(bg);
        colors.push({
          id: `color-${colors.length}`,
          name: `Color ${colors.length + 1}`,
          value: bg,
        });
      }
      if (fg && !colorSet.has(fg)) {
        colorSet.add(fg);
        colors.push({
          id: `color-${colors.length}`,
          name: `Color ${colors.length + 1}`,
          value: fg,
        });
      }

      // Text styles
      const fontSize = parseFloat(styles.fontSize);
      const fontWeight = parseInt(styles.fontWeight) || 400;
      const lineHeight = parseFloat(styles.lineHeight) || fontSize * 1.2;
      const fontFamily = styles.fontFamily
        .split(",")[0]
        .trim()
        .replace(/['"]/g, "");

      const fontKey = `${fontFamily}-${fontSize}-${fontWeight}`;
      if (!fontSet.has(fontKey) && fontSize > 0) {
        fontSet.add(fontKey);
        textStyles.push({
          id: `text-${textStyles.length}`,
          name: `Text ${textStyles.length + 1}`,
          fontFamily,
          fontSize,
          fontWeight,
          lineHeight,
        });
      }
    });

    // Common spacing values
    [4, 8, 12, 16, 24, 32, 48, 64].forEach((val, i) => {
      spacing.push({ id: `spacing-${i}`, name: `Spacing ${val}`, value: val });
    });

    return {
      colors: colors.slice(0, 20),
      textStyles: textStyles.slice(0, 15),
      spacing,
    };
  });

  return rawTokens;
}

function buildFallbackRoot(viewport: Viewport): AnalyzedNode {
  return {
    id: "root",
    tagName: "body",
    rect: { x: 0, y: 0, width: viewport.width, height: viewport.height },
    children: [],
    layout: {
      isLayoutContainer: true,
      axis: "vertical",
      gap: 16,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      alignment: { primary: "start", cross: "start" },
      inferredPattern: "column",
      componentKey: null,
    },
  };
}

function countNodes(node: any): number {
  if (!node) return 0;
  let count = 1;
  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      count += countNodes(child);
    }
  }
  return count;
}
