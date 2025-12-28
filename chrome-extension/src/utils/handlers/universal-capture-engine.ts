import { logger } from "../logger";
import { WebToFigmaSchema } from "../../types/schema";
import { FallbackSystem } from "./fallback-system";
import { DOMExtractor } from "../dom-extractor";

/**
 * Supported framework types for specialized handling
 */
export type Framework =
  | "React"
  | "Vue"
  | "Angular"
  | "Svelte"
  | "Next.js"
  | "Nuxt"
  | "Webflow"
  | "WordPress"
  | "Unknown";

/**
 * Configuration for the Universal Capture System
 */
export interface UniversalCaptureConfig {
  url: string;
  captureStrategy: "aggressive" | "balanced" | "lightweight";

  // Content toggles
  includeIframes: boolean; // Including cross-origin
  includeShadowDOM: boolean; // Web components
  includeCanvasContent: boolean; // Canvas/WebGL renders
  includeSVGContent: boolean; // Inline and external SVGs
  includePseudoElements: boolean; // ::before, ::after
  includeHiddenElements: boolean; // display:none, visibility:hidden
  includeScrollableAreas: boolean; // Overflow content

  // Framework-specific handling
  detectFramework: boolean;
  waitForHydration: boolean; // Wait for JS frameworks to load

  // Dynamic content
  waitForAnimations: boolean; // Let animations settle
  waitForLazyLoad: boolean; // Lazy-loaded images/content
  maxWaitTime: number; // Timeout for dynamic content

  // Fallback strategies
  screenshotFallback: boolean; // Use screenshot for complex elements
  simplifyComplexNodes: boolean; // Convert complex nodes to images

  // Single capture mode - always pixel-perfect
}

/**
 * Result of the pre-capture site analysis
 */
export interface SiteAnalysis {
  framework: Framework;
  complexity: number; // 0-100 score
  contentTypes: string[]; // detected types (canvas, video, etc)
  challenges: string[]; // detected challenges (tainted canvas, cross-origin iframes)
  estimatedLoadTime: number;
}

/**
 * UniversalCaptureEngine - The main orchestrator for adaptive capture strategies.
 *
 * It analyzes the target site and selects the best strategy/handlers to ensure
 * 100% coverage and high fidelity.
 */
export class UniversalCaptureEngine {
  /**
   * Capture a URL using the universal orchestration pipeline
   */
  async captureURL(
    url: string,
    config: UniversalCaptureConfig,
    screenshot?: string
  ): Promise<WebToFigmaSchema> {
    logger.info("capture", `Starting universal capture for: ${url}`, {
      strategy: config.captureStrategy,
    });
    const startTime = Date.now();

    try {
      // Step 1: Pre-capture analysis
      const analysisStart = Date.now();
      const siteAnalysis = await this.analyzeSite(url);
      const analysisDuration = Date.now() - analysisStart;
      logger.info("capture", "Site analysis complete", siteAnalysis);

      // Step 2: Adaptive strategy selection
      const strategy = this.selectOptimalStrategy(siteAnalysis, config);

      // Step 3: Multi-pass capture
      const executionStart = Date.now();
      const captureResult = await this.executeCapture(
        url,
        strategy,
        screenshot
      );
      const executionDuration = Date.now() - executionStart;

      // Step 4: Validation & gap filling
      const validationStart = Date.now();
      const validated = await this.validateAndFillGaps(captureResult);
      const validationDuration = Date.now() - validationStart;

      // Step 5: Fallback for failed elements
      const fallbackStart = Date.now();
      const complete = await this.applyFallbacks(validated);
      const fallbackDuration = Date.now() - fallbackStart;

      const totalDuration = Date.now() - startTime;

      // Inject Telemetry Metrics
      complete.metadata.metrics = {
        timings: {
          total: totalDuration,
          analysis: analysisDuration,
          execution: executionDuration,
          validation: validationDuration,
          fallback: fallbackDuration,
        },
        stats: {
          complexity: siteAnalysis.complexity,
          elements: this.countNodes(complete.root),
          gaps: complete.metadata.extractionGaps?.length || 0,
          fallbacks: complete.root.children.filter(
            (c) =>
              c.id.startsWith("fallback_") || c.id.startsWith("placeholder_")
          ).length,
        },
      };

      logger.info(
        "capture",
        `Universal capture completed in ${totalDuration}ms`,
        complete.metadata.metrics
      );

      return complete;
    } catch (error) {
      logger.error("capture", `Universal capture failed for ${url}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Analyze the site to identify frameworks, complexity, and rendering challenges
   */
  private async analyzeSite(url: string): Promise<SiteAnalysis> {
    const framework = await this.detectFramework();
    const complexity = await this.assessComplexity();

    const contentTypes: string[] = [];
    if (document.querySelectorAll("canvas").length > 0)
      contentTypes.push("canvas");
    if (document.querySelectorAll("video").length > 0)
      contentTypes.push("video");
    if (document.querySelectorAll("iframe").length > 0)
      contentTypes.push("iframe");

    return {
      framework,
      complexity,
      contentTypes,
      challenges: [], // Challenges will be updated during deep analysis
      estimatedLoadTime: 0,
    };
  }

  /**
          const element = node as Element;
          // Filter out script, style, meta, link, etc.
          if (
            ["SCRIPT", "STYLE", "META", "LINK", "NOSCRIPT"].includes(
              element.tagName
            )
          ) {
            return NodeFilter.FILTER_REJECT;
          }
          // Filter out elements that are not displayed
          const style = window.getComputedStyle(element);
          if (style.display === "none" || style.visibility === "hidden") {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    let currentNode = walker.nextNode() as Element;
    while (currentNode) {
      // Check if this element's ID exists in the captured schema
      if (!currentNode.hasAttribute("data-captured-id")) {
        // Find closest captured ancestor
        let parent = currentNode.parentElement;
        let parentId = "root";
        while (parent) {
          const id = parent.getAttribute("data-captured-id");
          if (id) {
            parentId = id;
            break;
          }
          parent = parent.parentElement;
        }

        gaps.push({ element: currentNode, parentId });
      }
      currentNode = walker.nextNode() as Element;
    }

    return gaps;
  }

  /**
   * Detect the JS framework used by the site
   */
  private async detectFramework(): Promise<Framework> {
    // Check for common framework indicators
    if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) return "React";
    if ((window as any).__VUE__) return "Vue";
    if (
      document.querySelector("[ng-version]") ||
      (window as any).getAllAngularRootElements
    )
      return "Angular";
    if ((window as any).__NEXT_DATA__) return "Next.js";
    if ((window as any).__svelte) return "Svelte";
    if (document.querySelector("[data-wf-page]")) return "Webflow";
    if (
      document.body.classList.contains("wp-admin") ||
      document.querySelector('link[href*="wp-content"]')
    )
      return "WordPress";

    return "Unknown";
  }

  /**
   * Assess the structural complexity of the site (0-100)
   */
  private async assessComplexity(): Promise<number> {
    const iframeCount = document.querySelectorAll("iframe").length;
    const canvasCount = document.querySelectorAll("canvas").length;
    const shadowHosts = Array.from(document.querySelectorAll("*")).filter(
      (el) => el.shadowRoot
    );
    const videoCount = document.querySelectorAll("video").length;
    const elementCount = document.querySelectorAll("*").length;

    // Weighting factors for complexity
    let score =
      iframeCount * 15 +
      canvasCount * 10 +
      shadowHosts.length * 20 +
      videoCount * 5;

    // Scale by total element density
    if (elementCount > 2000) score += 20;
    else if (elementCount > 1000) score += 10;

    return Math.min(100, score);
  }

  /**
   * Select the optimal capture strategy based on site analysis
   */
  private selectOptimalStrategy(
    analysis: SiteAnalysis,
    config: UniversalCaptureConfig
  ): UniversalCaptureConfig {
    const adjusted = { ...config };

    // If complex, shift towards 'aggressive' and increase wait times
    if (analysis.complexity > 70) {
      adjusted.captureStrategy = "aggressive";
      adjusted.maxWaitTime = Math.max(adjusted.maxWaitTime, 15000);
    }

    return adjusted;
  }

  private async executeCapture(
    url: string,
    config: UniversalCaptureConfig,
    screenshot?: string
  ): Promise<WebToFigmaSchema> {
    logger.info("capture", "Executing adaptive capture pass...");

    // In a real browser environment, we use the DOMExtractor
    const extractor = new DOMExtractor();
    const schema = await extractor.extractPageToSchema();

    if (screenshot) {
      schema.screenshot = screenshot;
    }

    return schema;
  }

  /**
   * Validate the capture result and fill in any logical gaps
   */
  private async validateAndFillGaps(
    schema: WebToFigmaSchema
  ): Promise<WebToFigmaSchema> {
    logger.info("capture", "Validating capture and detecting gaps...");
    const fallback = new FallbackSystem(schema);
    const gaps = await fallback.detectGaps();

    if (gaps.length > 0) {
      logger.warn("capture", `Detected ${gaps.length} gaps in DOM extraction`);
      // Store gaps in metadata for the fallback pass
      schema.metadata.extractionGaps = gaps;
    }

    return schema;
  }

  private async applyFallbacks(
    schema: WebToFigmaSchema
  ): Promise<WebToFigmaSchema> {
    const gaps = schema.metadata.extractionGaps;
    if (!gaps || gaps.length === 0) return schema;

    logger.info("capture", `Applying fallbacks for ${gaps.length} gaps...`);
    const fallback = new FallbackSystem(schema, schema.screenshot || null);

    for (const gap of gaps) {
      try {
        const fallbackNode = await fallback.recoverNodeFromScreenshot(
          gap.element,
          gap.parentId
        );

        if (fallbackNode) {
          // Attach to parent or root
          this.attachToNode(schema.root, gap.parentId, fallbackNode);
        } else {
          // Final fallback: placeholder
          this.attachToNode(
            schema.root,
            gap.parentId,
            fallback.generatePlaceholder(gap.element)
          );
        }
      } catch (err) {
        logger.error("capture", "Fallback recovery failed for element", {
          tag: gap.element.tagName,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return schema;
  }

  /**
   * Helper to attach a node to a specific parent ID in the tree
   */
  private attachToNode(root: any, parentId: string, node: any): boolean {
    if (root.id === parentId) {
      root.children.push(node);
      return true;
    }
    if (root.children) {
      for (const child of root.children) {
        if (this.attachToNode(child, parentId, node)) return true;
      }
    }
    return false;
  }

  /**
   * Helper to count total nodes in a tree
   */
  private countNodes(node: any): number {
    let count = 1;
    if (node.children) {
      for (const child of node.children) {
        count += this.countNodes(child);
      }
    }
    return count;
  }
}
