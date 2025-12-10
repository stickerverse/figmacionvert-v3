import { NodeBuilder } from "./node-builder";
import { StyleManager } from "./style-manager";
import { ComponentManager } from "./component-manager";
import { VariantsFrameBuilder } from "./variants-frame-builder";
import { DesignSystemBuilder } from "./design-system-builder";
import { upgradeToAutoLayout } from "./layout-upgrader";
import { PhysicsLayoutSolver, LayoutSolution } from "./physics-layout-solver";
import { ScreenshotOverlay } from "./screenshot-overlay";
import { DesignTokensManager } from "./design-tokens-manager";

type AbsoluteRect = {
  left: number;
  top: number;
  width?: number;
  height?: number;
};
type AutoLayoutTarget = {
  node: FrameNode | GroupNode;
  data: any;
  depth: number;
};

export interface ImportOptions {
  createMainFrame: boolean;
  createVariantsFrame: boolean;
  createComponentsFrame: boolean;
  createDesignSystem: boolean;
  applyAutoLayout: boolean;
  createStyles: boolean;
  usePixelPerfectPositioning: boolean;
  createScreenshotOverlay: boolean;
  showValidationMarkers: boolean;
}

export class FigmaImporter {
  private data: any;
  private nodeBuilder!: NodeBuilder;
  private styleManager!: StyleManager;
  private componentManager!: ComponentManager;
  private variantsBuilder!: VariantsFrameBuilder;
  private designSystemBuilder!: DesignSystemBuilder;
  private designTokensManager?: DesignTokensManager;
  private autoLayoutTargets: AutoLayoutTarget[] = [];
  private autoLayoutTargetIds = new Set<string>();
  private documentOrigin: AbsoluteRect = { left: 0, top: 0 };
  private scaleFactor = 1;
  private debugPlacement = true;
  private placementDiagnostics = {
    total: 0,
    missingAbsolute: 0,
    deltasOverThreshold: 0,
    missingPaint: 0,
    missingImages: 0,
    zeroOpacity: 0,
    driftSamples: [] as Array<{
      id: string;
      name: string;
      expected: { x: number; y: number };
      actual: { x: number; y: number };
      delta: { dx: number; dy: number };
    }>,
    paintSamples: [] as Array<{
      id: string;
      name: string;
      expectedFills: number;
      actualFills: number;
    }>,
    imageSamples: [] as Array<{
      id: string;
      name: string;
      note: string;
    }>,
  };

  private stats = {
    elements: 0,
    components: 0,
    frames: 0,
    styles: 0,
    autoLayoutContainers: 0,
  };

  private progressCallback?: (
    percent: number,
    message: string,
    phase?: string
  ) => void;

  constructor(private options: ImportOptions) {
    console.warn("🛰️ Placement diagnostics enabled. Expect verbose logging.");
  }

  setProgressCallback(
    callback: (percent: number, message: string, phase?: string) => void
  ) {
    this.progressCallback = callback;
  }

  async import(
    data: any
  ): Promise<{
    elementsCount: number;
    stylesCount: number;
    componentsCount: number;
  }> {
    this.data = data;

    // Initialize design tokens manager if enhanced tokens are available
    if (data.designTokensRegistry) {
      this.designTokensManager = new DesignTokensManager(
        data.designTokensRegistry
      );
    }

    this.styleManager = new StyleManager(data.styles, this.designTokensManager);
    this.componentManager = new ComponentManager(data.components);
    this.nodeBuilder = new NodeBuilder(
      this.styleManager,
      this.componentManager,
      this.options,
      data.assets,
      this.designTokensManager
    );
    this.variantsBuilder = new VariantsFrameBuilder(this.nodeBuilder);
    this.designSystemBuilder = new DesignSystemBuilder(data.styles);
    this.documentOrigin = this.computeDocumentOrigin();
    this.scaleFactor = this.computeScaleFactor();

    await this.run();

    return {
      elementsCount: this.stats.elements,
      stylesCount: this.stats.styles,
      componentsCount: this.stats.components,
    };
  }

  private reportProgress(percent: number, message: string, phase?: string) {
    if (this.progressCallback) {
      this.progressCallback(percent, message, phase);
    } else {
      figma.ui.postMessage({ type: "progress", message, percent });
    }
  }

  async run(): Promise<void> {
    this.reportProgress(0, "Initializing...", "Init");

    // Check if this is a multi-viewport capture
    if (this.data.multiViewport && this.data.captures) {
      await this.runMultiViewport();
      return;
    }

    await this.loadFonts();

    // Create design tokens/variables if available
    if (this.designTokensManager) {
      this.reportProgress(
        5,
        "Creating design tokens and variables...",
        "Tokens"
      );
      await this.designTokensManager.createFigmaVariables();

      const tokenStats = this.designTokensManager.getStatistics();
      console.log("✅ Design tokens created:", tokenStats);

      figma.ui.postMessage({
        type: "message",
        message: `Created ${tokenStats.variables} variables in ${tokenStats.collections} collections`,
      });
    }

    if (this.options.createStyles) {
      this.reportProgress(10, "Creating styles...", "Styles");
      await this.styleManager.createFigmaStyles();
      this.stats.styles = this.styleManager.getStyleCount();
    }

    const page = figma.currentPage;
    page.name = `${this.data.metadata.title} - ${this.data.metadata.viewport.width}px`;

    let xOffset = 0;
    const spacing = 100;

    if (this.options.createMainFrame) {
      this.reportProgress(30, "Creating main frame...", "Structure");
      const mainFrame = await this.createMainFrame();
      page.appendChild(mainFrame);
      mainFrame.x = xOffset;
      mainFrame.y = 0;
      xOffset += mainFrame.width + spacing;
      this.stats.frames++;
    }

    if (this.options.createVariantsFrame && this.data.variants) {
      this.reportProgress(50, "Creating variants frame...", "Variants");
      const variantsFrame = await this.variantsBuilder.createVariantsFrame(
        this.data.variants
      );
      if (variantsFrame) {
        page.appendChild(variantsFrame);
        variantsFrame.x = xOffset;
        variantsFrame.y = 0;
        xOffset += variantsFrame.width + spacing;
        this.stats.frames++;
      }
    }

    if (this.options.createComponentsFrame && this.data.components) {
      this.reportProgress(70, "Creating components library...", "Components");
      const componentsFrame = await this.createComponentsLibrary();
      if (componentsFrame) {
        page.appendChild(componentsFrame);
        componentsFrame.x = xOffset;
        componentsFrame.y = 0;
        this.stats.frames++;
        this.stats.components = Object.keys(
          this.data.components.components || {}
        ).length;
      }
    }

    if (this.options.createDesignSystem) {
      this.reportProgress(90, "Creating design system...", "Design System");
      const dsPage = await this.designSystemBuilder.createDesignSystemPage();
      this.stats.frames += 3;
    }

    this.reportProgress(100, "Finalizing...", "Complete");

    figma.viewport.scrollAndZoomIntoView(page.children);
    this.flushPlacementDiagnostics();
  }

  private async runMultiViewport(): Promise<void> {
    this.reportProgress(
      5,
      "Processing multi-viewport capture...",
      "Multi-Viewport"
    );

    const page = figma.currentPage;
    const firstCapture = this.data.captures[0];
    page.name = firstCapture?.data?.metadata?.title || "Multi-Viewport Import";

    let xOffset = 0;
    const spacing = 100;

    for (let i = 0; i < this.data.captures.length; i++) {
      const capture = this.data.captures[i];
      const progressPercent = 10 + (i / this.data.captures.length) * 80;

      this.reportProgress(
        progressPercent,
        `Creating ${capture.viewport} frame (${i + 1}/${
          this.data.captures.length
        })...`,
        "Viewport"
      );

      // Temporarily swap data to build this viewport's frame
      const originalData = this.data;
      this.data = capture.data;

      // Rebuild managers with this viewport's data
      this.styleManager = new StyleManager(capture.data.styles);
      this.componentManager = new ComponentManager(capture.data.components);
      this.nodeBuilder = new NodeBuilder(
        this.styleManager,
        this.componentManager,
        this.options,
        capture.data.assets
      );

      if (i === 0 && this.options.createStyles) {
        await this.styleManager.createFigmaStyles();
        this.stats.styles = this.styleManager.getStyleCount();
      }

      const viewportFrame = await this.createMainFrame();
      viewportFrame.name = `${capture.viewport} (${capture.width}x${capture.height})`;
      page.appendChild(viewportFrame);

      // Set position AFTER appending to parent
      viewportFrame.x = xOffset;
      viewportFrame.y = 0;

      xOffset += viewportFrame.width + spacing;
      this.stats.frames++;
      this.stats.elements += this.countNodes(viewportFrame);

      // Restore original data
      this.data = originalData;
    }

    this.reportProgress(100, "Finalizing...", "Complete");
    figma.viewport.scrollAndZoomIntoView(page.children);
    this.flushPlacementDiagnostics();
  }

  /**
   * Build nodes with precise positioning data for pixel-perfect accuracy
   */
  private async buildNodeWithPrecisePositioning(
    nodeData: any,
    parent: BaseNode & ChildrenMixin,
    nodeMap: Map<string, SceneNode>,
    depth = 0,
    parentAbsolute: AbsoluteRect | null = null
  ): Promise<SceneNode | null> {
    const node = await this.nodeBuilder.createNode(nodeData);
    if (!node) return null;

    // Store in map for layout solver reference
    nodeMap.set(nodeData.id, node);

    parent.appendChild(node);
    this.applyPrecisePositioning(node, nodeData, parentAbsolute);

    if (this.options.applyAutoLayout) {
      this.registerAutoLayoutCandidate(node, nodeData, depth);
    }

    this.recordPlacementDiagnostics(nodeData, node);

    // Build children recursively
    if (nodeData.children && "appendChild" in node) {
      const nextParentAbsolute =
        nodeData.absoluteLayout ||
        this.deriveAbsoluteFromLayout(nodeData, parentAbsolute);
      for (const child of nodeData.children) {
        await this.buildNodeWithPrecisePositioning(
          child,
          node as any,
          nodeMap,
          depth + 1,
          nextParentAbsolute
        );
      }
    }

    // Build pseudo-elements (::before, ::after)
    if (nodeData.pseudoElements && "appendChild" in node) {
      const nextParentAbsolute =
        nodeData.absoluteLayout ||
        this.deriveAbsoluteFromLayout(nodeData, parentAbsolute);

      if (nodeData.pseudoElements.before) {
        await this.buildNodeWithPrecisePositioning(
          nodeData.pseudoElements.before,
          node as any,
          nodeMap,
          depth + 1,
          nextParentAbsolute
        );
      }

      if (nodeData.pseudoElements.after) {
        await this.buildNodeWithPrecisePositioning(
          nodeData.pseudoElements.after,
          node as any,
          nodeMap,
          depth + 1,
          nextParentAbsolute
        );
      }
    }

    return node;
  }

  /**
   * Add validation markers to show positioning accuracy
   */
  private async addValidationMarkers(
    frame: FrameNode,
    nodeMap: Map<string, SceneNode>
  ): Promise<void> {
    const validationData = this.calculatePositionAccuracy(nodeMap);

    ScreenshotOverlay.createValidationMarkers(frame, {
      accurateElements: validationData.accurate,
      inaccurateElements: validationData.inaccurate,
    });
  }

  /**
   * Calculate positioning accuracy for validation
   */
  private calculatePositionAccuracy(nodeMap: Map<string, SceneNode>): {
    accurate: Array<{ id: string; accuracy: number }>;
    inaccurate: Array<{
      id: string;
      expectedPos: { x: number; y: number };
      actualPos: { x: number; y: number };
    }>;
  } {
    const accurate: Array<{ id: string; accuracy: number }> = [];
    const inaccurate: Array<{
      id: string;
      expectedPos: { x: number; y: number };
      actualPos: { x: number; y: number };
    }> = [];

    // Simple validation - compare expected vs actual positions
    nodeMap.forEach((figmaNode, nodeId) => {
      // This would be enhanced with actual position comparison logic
      // For now, assume 95% accuracy for demonstration
      const mockAccuracy = 0.95;

      if (mockAccuracy >= 0.9) {
        accurate.push({ id: nodeId, accuracy: mockAccuracy });
      } else {
        inaccurate.push({
          id: nodeId,
          expectedPos: { x: figmaNode.x, y: figmaNode.y },
          actualPos: { x: figmaNode.x + 5, y: figmaNode.y + 3 }, // Mock offset
        });
      }
    });

    return { accurate, inaccurate };
  }

  private countNodes(node: BaseNode): number {
    let count = 1;
    if ("children" in node) {
      for (const child of node.children) {
        count += this.countNodes(child);
      }
    }
    return count;
  }

  private recordPlacementDiagnostics(nodeData: any, node: SceneNode) {
    if (!this.debugPlacement) return;
    this.placementDiagnostics.total++;

    const absolute = nodeData.absoluteLayout;
    if (!absolute) {
      this.placementDiagnostics.missingAbsolute++;
      console.warn(
        "[placement] Missing absoluteLayout for node",
        nodeData.id,
        nodeData.name
      );
      return;
    }

    const transform = node.absoluteTransform;
    const actualX = transform[0][2];
    const actualY = transform[1][2];
    const expectedX =
      ((absolute.left ?? nodeData.layout?.x ?? 0) -
        (this.documentOrigin.left ?? 0)) *
      this.scaleFactor;
    const expectedY =
      ((absolute.top ?? nodeData.layout?.y ?? 0) -
        (this.documentOrigin.top ?? 0)) *
      this.scaleFactor;
    const dx = actualX - expectedX;
    const dy = actualY - expectedY;
    const deltaMagnitude = Math.hypot(dx, dy);
    const THRESHOLD = 0.5;

    if (deltaMagnitude > THRESHOLD) {
      this.placementDiagnostics.deltasOverThreshold++;
      if (this.placementDiagnostics.driftSamples.length < 50) {
        this.placementDiagnostics.driftSamples.push({
          id: nodeData.id,
          name: nodeData.name,
          expected: {
            x: Number(expectedX.toFixed(2)),
            y: Number(expectedY.toFixed(2)),
          },
          actual: {
            x: Number(actualX.toFixed(2)),
            y: Number(actualY.toFixed(2)),
          },
          delta: { dx: Number(dx.toFixed(3)), dy: Number(dy.toFixed(3)) },
        });
      }
      console.warn(
        `[placement] Drift detected for ${nodeData.id} (${
          nodeData.name
        }): Δ=(${dx.toFixed(3)}, ${dy.toFixed(3)})`
      );
    }

    this.checkPaintDiagnostics(nodeData, node);
  }

  private checkPaintDiagnostics(nodeData: any, node: SceneNode) {
    const expectedFillCount = Array.isArray(nodeData.fills)
      ? nodeData.fills.length
      : 0;
    const supportsFills = "fills" in node;
    let actualFillCount = 0;
    let hasImageFill = false;

    if (supportsFills) {
      const fills = (node as SceneNode & GeometryMixin).fills;
      if (fills !== figma.mixed && Array.isArray(fills)) {
        actualFillCount = fills.length;
        hasImageFill = fills.some((fill) => (fill as Paint).type === "IMAGE");
      }
    }

    if (expectedFillCount > 0 && actualFillCount === 0) {
      this.placementDiagnostics.missingPaint++;
      if (this.placementDiagnostics.paintSamples.length < 25) {
        this.placementDiagnostics.paintSamples.push({
          id: nodeData.id,
          name: nodeData.name,
          expectedFills: expectedFillCount,
          actualFills: actualFillCount,
        });
      }
      console.warn(
        `[paint] Missing fills for ${nodeData.id} (${nodeData.name}). Expected ${expectedFillCount}, found ${actualFillCount}`
      );
    }

    if (nodeData.imageHash && !hasImageFill) {
      this.placementDiagnostics.missingImages++;
      if (this.placementDiagnostics.imageSamples.length < 25) {
        this.placementDiagnostics.imageSamples.push({
          id: nodeData.id,
          name: nodeData.name,
          note: "Image hash present but no IMAGE fill applied",
        });
      }
      console.warn(
        `[paint] Missing image fill for ${nodeData.id} (${nodeData.name}) despite imageHash ${nodeData.imageHash}`
      );
    }

    if ("opacity" in node && node.opacity === 0) {
      this.placementDiagnostics.zeroOpacity++;
      console.warn(
        `[paint] Node ${nodeData.id} (${nodeData.name}) has 0 opacity; it will appear invisible.`
      );
    }
  }

  private flushPlacementDiagnostics() {
    const summary = {
      totalNodes: this.placementDiagnostics.total,
      missingAbsolute: this.placementDiagnostics.missingAbsolute,
      overThreshold: this.placementDiagnostics.deltasOverThreshold,
      missingPaint: this.placementDiagnostics.missingPaint,
      missingImages: this.placementDiagnostics.missingImages,
      zeroOpacity: this.placementDiagnostics.zeroOpacity,
    };
    console.log("📐 Placement diagnostics summary", summary);
    if (this.placementDiagnostics.driftSamples.length) {
      console.table(this.placementDiagnostics.driftSamples);
    }
    if (this.placementDiagnostics.paintSamples.length) {
      console.table(this.placementDiagnostics.paintSamples);
    }
    if (this.placementDiagnostics.imageSamples.length) {
      console.table(this.placementDiagnostics.imageSamples);
    }
    figma.ui.postMessage({
      type: "placement-diagnostics",
      summary,
      driftSamples: this.placementDiagnostics.driftSamples,
      paintSamples: this.placementDiagnostics.paintSamples,
      imageSamples: this.placementDiagnostics.imageSamples,
    });
  }

  private getRootBounds(): { width: number; height: number } {
    const absolute = this.data?.tree?.absoluteLayout;
    if (absolute?.width && absolute?.height) {
      return {
        width: Math.max(absolute.width, 1),
        height: Math.max(absolute.height, 1),
      };
    }
    const layout = this.data?.tree?.layout || {};
    const viewport = this.data?.metadata?.viewport || {};
    // Some captures report a 0-height root; fall back to viewport dimensions so the main frame
    // has sensible bounds and children aren’t drawn into a 1px canvas.
    const widthFallback = viewport.width || 1;
    const heightFallback = viewport.height || 1;
    return {
      width: Math.max(layout.width || widthFallback, 1),
      height: Math.max(layout.height || heightFallback, 1),
    };
  }

  private computeDocumentOrigin(): AbsoluteRect {
    const absolute = this.data?.tree?.absoluteLayout;

    // CRITICAL FIX: Document origin should always be (0,0) in the web document coordinate system.
    // The root element's absoluteLayout.left/top represent its position in the document,
    // which may be non-zero due to CSS margin, padding, or transforms.
    // When we create the main Figma frame to represent this root element,
    // the frame itself is at (0,0) in Figma coordinates, so we must offset
    // all children by the root element's document position to maintain relative positioning.

    if (absolute) {
      // Use root element's absolute position as the document origin
      // This ensures child elements are positioned correctly relative to the root
      const origin = {
        left: absolute.left ?? 0,
        top: absolute.top ?? 0,
        width: absolute.width,
        height: absolute.height,
      };

      console.log(`📐 Document origin calculated from root element:`, {
        origin,
        rootElement: this.data.tree.name,
        explanation:
          "Root element absoluteLayout provides the offset from document (0,0)",
        viewport: this.data.metadata?.viewport,
      });

      return origin;
    }

    console.warn(
      `⚠️ No absolute layout found for root element, using (0,0) origin`
    );
    return { left: 0, top: 0 };
  }

  private computeScaleFactor(): number {
    const viewport = this.data?.metadata?.viewport || {};
    // screenshotScale is provided by some capture paths when the screenshot is taken at device scale
    const screenshotScale = viewport.screenshotScale || viewport.scale || 1;
    // Device scale factor is available from the browser capture; default to 1 if missing
    const deviceScale =
      viewport.deviceScaleFactor || viewport.devicePixelRatio || 1;

    const scaleCandidate =
      screenshotScale !== 1 ? screenshotScale : deviceScale;

    // If the captured coordinates are already in CSS pixels (most cases), we should NOT shrink them.
    // Heuristic: if the root's absolute width matches the layout width, treat coordinates as CSS px.
    const rootAbsW = this.data?.tree?.absoluteLayout?.width;
    const rootLayoutW = this.data?.tree?.layout?.width;
    const coordsLookLikeCssPx =
      typeof rootAbsW === "number" &&
      typeof rootLayoutW === "number" &&
      Math.abs(rootAbsW - rootLayoutW) < 0.5;

    // Only apply scale when coordinates are likely device-pixel based and we have a >1 scale candidate.
    // FIX: Explicitly check metadata for coordinate system
    const captureCoordinateSystem =
      this.data.metadata?.captureCoordinateSystem || "css-pixels";
    const shouldScale =
      captureCoordinateSystem === "device-pixels" && scaleCandidate > 1;

    const factor = shouldScale ? 1 / scaleCandidate : 1;

    if (factor !== 1) {
      console.log(
        `📏 Using scale factor ${factor} (screenshotScale=${screenshotScale}, deviceScale=${deviceScale}, coordsLookLikeCssPx=${coordsLookLikeCssPx})`
      );
    }

    return factor;
  }

  private applyPrecisePositioning(
    node: SceneNode,
    data: any,
    parentAbsolute?: AbsoluteRect | null
  ): void {
    const originLeft = parentAbsolute?.left ?? this.documentOrigin.left ?? 0;
    const originTop = parentAbsolute?.top ?? this.documentOrigin.top ?? 0;

    // ENHANCED: Comprehensive coordinate validation and logging
    console.log(`📍 Positioning ${data.name || "unnamed"}:`, {
      nodeType: node.type,
      absoluteLayout: data?.absoluteLayout,
      parentOrigin: { left: originLeft, top: originTop },
      documentOrigin: this.documentOrigin,
    });

    if (data?.absoluteLayout) {
      const { left = 0, top = 0, width, height } = data.absoluteLayout;

      // Enhanced coordinate validation with bounds checking
      if (!Number.isFinite(left) || !Number.isFinite(top)) {
        console.error(
          `❌ Invalid coordinates for ${data.name}: left=${left}, top=${top}`
        );
        return;
      }

      // Calculate final Figma coordinates with scaling for high-DPR captures
      const figmaX = (left - originLeft) * this.scaleFactor;
      const figmaY = (top - originTop) * this.scaleFactor;

      // Validate final Figma coordinates are reasonable
      if (Math.abs(figmaX) > 20000 || Math.abs(figmaY) > 20000) {
        console.warn(`⚠️ Extreme Figma coordinates for ${data.name}:`, {
          calculated: { x: figmaX, y: figmaY },
          source: { left, top },
          origin: { left: originLeft, top: originTop },
        });
      }

      // Apply validated coordinates
      node.x = Math.round(figmaX * 100) / 100; // Round to 2 decimal places
      node.y = Math.round(figmaY * 100) / 100;

      console.log(`✅ Applied coordinates: (${node.x}, ${node.y})`);

      // CRITICAL FIX: Always apply size, with fallback to layout.width/height
      let finalWidth = width;
      let finalHeight = height;

      // Fallback to layout dimensions if absoluteLayout dimensions are missing or invalid
      if (!(typeof finalWidth === "number" && finalWidth > 0)) {
        finalWidth = data.layout?.width;
        console.warn(
          `⚠️ Using layout.width fallback for ${data.name}: ${finalWidth}`
        );
      }
      if (!(typeof finalHeight === "number" && finalHeight > 0)) {
        finalHeight = data.layout?.height;
        console.warn(
          `⚠️ Using layout.height fallback for ${data.name}: ${finalHeight}`
        );
      }

      if (
        typeof finalWidth === "number" &&
        typeof finalHeight === "number" &&
        finalWidth > 0 &&
        finalHeight > 0
      ) {
        const scaledWidth =
          Math.round(finalWidth * this.scaleFactor * 100) / 100;
        const scaledHeight =
          Math.round(finalHeight * this.scaleFactor * 100) / 100;
        this.resizeNode(node, scaledWidth, scaledHeight);
        console.log(
          `✅ Applied size: ${scaledWidth.toFixed(2)}×${scaledHeight.toFixed(
            2
          )} (scale ${this.scaleFactor})`
        );
      } else {
        console.error(
          `❌ Invalid size for ${data.name}: width=${finalWidth}, height=${finalHeight}`
        );
      }
      return;
    }

    if (data?.layout) {
      if (typeof data.layout.x === "number") {
        node.x = data.layout.x * this.scaleFactor;
      }
      if (typeof data.layout.y === "number") {
        node.y = data.layout.y * this.scaleFactor;
      }
      if (
        typeof data.layout.width === "number" &&
        typeof data.layout.height === "number"
      ) {
        this.resizeNode(
          node,
          data.layout.width * this.scaleFactor,
          data.layout.height * this.scaleFactor
        );
      }
    }
  }

  private resizeNode(node: SceneNode, width: number, height: number) {
    if (width <= 0 || height <= 0) return;
    const targetWidth = Math.max(width, 1);
    const targetHeight = Math.max(height, 1);

    if (
      "resizeWithoutConstraints" in node &&
      typeof (node as any).resizeWithoutConstraints === "function"
    ) {
      try {
        (node as any).resizeWithoutConstraints(targetWidth, targetHeight);
        return;
      } catch {
        // Fallback to resize below
      }
    }

    if ("resize" in node && typeof (node as any).resize === "function") {
      try {
        (node as LayoutMixin).resize(targetWidth, targetHeight);
      } catch {
        // Ignore nodes that cannot resize
      }
    }
  }

  private deriveAbsoluteFromLayout(
    nodeData: any,
    parentAbsolute?: AbsoluteRect | null
  ): AbsoluteRect | null {
    if (!nodeData?.layout) return parentAbsolute || null;
    const originLeft = parentAbsolute?.left ?? this.documentOrigin.left ?? 0;
    const originTop = parentAbsolute?.top ?? this.documentOrigin.top ?? 0;

    return {
      left: originLeft + (nodeData.layout.x ?? 0),
      top: originTop + (nodeData.layout.y ?? 0),
      width: nodeData.layout.width,
      height: nodeData.layout.height,
    };
  }

  private registerAutoLayoutCandidate(
    node: SceneNode,
    data: any,
    depth: number
  ) {
    if (!this.shouldTrackAutoLayoutCandidate(node, data)) return;
    if (this.autoLayoutTargetIds.has(node.id)) return;

    this.autoLayoutTargets.push({
      node: node as FrameNode | GroupNode,
      data,
      depth,
    });
    this.autoLayoutTargetIds.add(node.id);
  }

  private shouldTrackAutoLayoutCandidate(
    node: SceneNode,
    data: any
  ): node is FrameNode | GroupNode {
    const layoutMode = data?.autoLayout?.layoutMode;
    if (!layoutMode || layoutMode === "NONE") return false;
    if (node.type !== "FRAME" && node.type !== "GROUP") return false;
    if (!("children" in node) || node.children.length < 2) return false;
    return true;
  }

  private applyAutoLayoutPass(): void {
    if (!this.autoLayoutTargets.length) {
      return;
    }

    const sortedTargets = [...this.autoLayoutTargets].sort(
      (a, b) => b.depth - a.depth
    );
    let upgraded = 0;

    for (const target of sortedTargets) {
      if (!this.isNodeStillAttached(target.node)) continue;
      const upgradedNode = upgradeToAutoLayout(target.node);
      if (upgradedNode) {
        upgraded++;
      }
    }

    if (upgraded > 0) {
      this.reportProgress(
        42,
        `Auto Layout applied to ${upgraded} containers`,
        "Auto Layout"
      );
    }

    this.stats.autoLayoutContainers += upgraded;
    this.autoLayoutTargets = [];
    this.autoLayoutTargetIds.clear();
  }

  private isNodeStillAttached(node: SceneNode): boolean {
    return !node.removed;
  }

  private async loadFonts(): Promise<void> {
    const fonts = this.data.metadata.fonts || [];
    const fontsToLoad = new Set<{ family: string; style: string }>();

    fontsToLoad.add({ family: "Inter", style: "Regular" });
    fontsToLoad.add({ family: "Inter", style: "Medium" });
    fontsToLoad.add({ family: "Inter", style: "Semi Bold" });
    fontsToLoad.add({ family: "Inter", style: "Bold" });

    for (const font of fonts) {
      try {
        await figma.loadFontAsync({ family: font.family, style: "Regular" });
        await figma.loadFontAsync({ family: font.family, style: "Bold" });
      } catch (e) {
        console.warn(`Failed to load font: ${font.family}`);
      }
    }

    for (const fontSpec of fontsToLoad) {
      try {
        await figma.loadFontAsync(fontSpec);
      } catch (e) {
        console.warn(`Failed to load ${fontSpec.family} ${fontSpec.style}`);
      }
    }
  }

  private async createMainFrame(): Promise<FrameNode> {
    const mainFrame = figma.createFrame();
    mainFrame.name = `${this.data.metadata.title} - Main`;
    const rootBounds = this.getRootBounds();
    mainFrame.resize(rootBounds.width, rootBounds.height);
    mainFrame.clipsContent = false;
    this.documentOrigin = this.computeDocumentOrigin();
    this.autoLayoutTargets = [];
    this.autoLayoutTargetIds.clear();

    // Step 1: Analyze layout with physics-based solver
    // Step 1: Analyze layout with physics-based solver
    this.reportProgress(32, "Analyzing layout strategy...", "Analysis");
    const layoutSolution = PhysicsLayoutSolver.solveLayout(this.data.tree);

    console.log(
      `🎯 Layout analysis complete: ${layoutSolution.length} nodes solved`
    );

    // Position this import to the right of existing frames on the page to avoid overlap
    const nextPos = this.getNextImportPosition(rootBounds.width, rootBounds.height);
    mainFrame.x = nextPos.x;
    mainFrame.y = nextPos.y;

    // Step 2: Create screenshot overlay for reference (if enabled)
    if (this.options.createScreenshotOverlay && this.data.screenshot) {
      this.reportProgress(34, "Creating reference overlay...", "Overlay");
      await ScreenshotOverlay.createReferenceOverlay(
        this.data.screenshot,
        mainFrame,
        {
          opacity: 0.3,
          visible: true,
          position: "background",
        }
      );
    }

    // Step 3: Build nodes with pixel-perfect positioning
    // Step 3: Build nodes with pixel-perfect positioning
    this.reportProgress(36, "Building pixel-perfect layout...", "Layout");
    const nodeMap = new Map<string, SceneNode>();
    await this.buildNodeWithPrecisePositioning(
      this.data.tree,
      mainFrame,
      nodeMap,
      0,
      this.documentOrigin
    );

    // Step 4: Apply layout solution for optimal positioning
    if (this.options.usePixelPerfectPositioning) {
      const shouldApplySolution = !this.options.applyAutoLayout;
      if (shouldApplySolution) {
        this.reportProgress(38, "Applying physics-based layout...", "Physics");
        PhysicsLayoutSolver.applyLayoutSolution(
          layoutSolution,
          mainFrame,
          nodeMap
        );
      }
    }

    // Step 5: Add validation markers (if enabled)
    if (this.options.showValidationMarkers) {
      this.reportProgress(40, "Creating validation markers...", "Validation");
      await this.addValidationMarkers(mainFrame, nodeMap);
    }

    // Step 6: Upgrade eligible containers to Auto Layout after geometry is locked
    if (this.options.applyAutoLayout) {
      this.reportProgress(
        41,
        "Auto-upgrading layout containers...",
        "Auto Layout"
      );
      this.applyAutoLayoutPass();
    }

    // Legacy screenshot reference (for backward compatibility)
    if (!this.options.createScreenshotOverlay) {
      await this.addScreenshotReference(mainFrame, this.data.screenshot);
    }

    // Notify agent runner of completion
    await this.notifyAgentRunner({
      fileId: figma.fileKey,
      pageName: figma.currentPage.name,
      totalNodes: this.stats.elements,
      stats: this.stats,
      diagnostics: this.placementDiagnostics,
    });

    return mainFrame;
  }

  /**
   * Compute where to place the next imported frame so it does not overlap
   * previous imports. We lay frames out in a single row to the right with spacing.
   */
  private getNextImportPosition(
    width: number,
    height: number
  ): { x: number; y: number } {
    const page = figma.currentPage;
    const siblings = page.children.filter(
      (n) => n.type === "FRAME" || n.type === "COMPONENT" || n.type === "INSTANCE"
    ) as Array<FrameNode | ComponentNode | InstanceNode>;

    if (!siblings.length) {
      return { x: 0, y: 0 };
    }

    let maxRight = 0;
    let minY = 0;
    siblings.forEach((n) => {
      const right = n.x + n.width;
      if (right > maxRight) maxRight = right;
      if (n.y < minY) minY = n.y;
    });

    const padding = 200; // space between imports
    return { x: maxRight + padding, y: minY };
  }

  private async addScreenshotReference(frame: FrameNode, screenshot?: string) {
    if (!screenshot) return;

    try {
      const bytes = this.decodeScreenshot(screenshot);
      if (!bytes) return;

      const image = figma.createImage(bytes);
      const reference = figma.createRectangle();
      reference.name = "Screenshot Reference";
      reference.resize(frame.width, frame.height);
      reference.locked = true;
      reference.fills = [
        {
          type: "IMAGE",
          scaleMode: "FILL",
          imageHash: image.hash,
        },
      ];
      reference.opacity = 0.35;
      reference.constraints = {
        horizontal: "SCALE",
        vertical: "SCALE",
      };

      frame.insertChild(0, reference);
    } catch (error) {
      console.warn("Failed to add screenshot reference layer", error);
    }
  }

  private decodeScreenshot(dataUrl?: string): Uint8Array | null {
    if (!dataUrl) return null;

    const { payload } = this.extractDataUrl(dataUrl);
    const candidates = [
      this.normalizeBase64Payload(payload),
      this.normalizeBase64Payload(this.safeDecodeUriComponent(payload)),
    ];

    for (const candidate of candidates) {
      if (!candidate) continue;
      try {
        return figma.base64Decode(candidate);
      } catch {
        continue;
      }
    }

    console.warn("Failed to decode screenshot data");
    return null;
  }

  private extractDataUrl(value: string): { payload: string } {
    if (!value.startsWith("data:")) {
      return { payload: value };
    }
    const commaIndex = value.indexOf(",");
    const payload = commaIndex === -1 ? "" : value.substring(commaIndex + 1);
    return { payload };
  }

  private safeDecodeUriComponent(value: string): string {
    if (typeof value !== "string") return "";
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  private normalizeBase64Payload(payload: string): string {
    if (typeof payload !== "string") return "";
    let normalized = payload.replace(/\s/g, "");
    normalized = normalized.replace(/-/g, "+").replace(/_/g, "/");
    normalized = normalized.replace(/[^A-Za-z0-9+/=]/g, "");
    while (normalized.length % 4 !== 0 && normalized.length > 0) {
      normalized += "=";
    }
    return normalized;
  }

  private async buildNode(
    nodeData: any,
    parent: BaseNode & ChildrenMixin
  ): Promise<void> {
    const node = await this.nodeBuilder.createNode(nodeData);
    if (!node) return;

    parent.appendChild(node);
    this.stats.elements++;

    if (this.shouldRecurse(node, nodeData)) {
      await this.buildChildren(nodeData, node as BaseNode & ChildrenMixin);
    }

    this.attemptAutoLayoutUpgrade(node, nodeData);
  }

  private async buildChildren(
    nodeData: any,
    parent: BaseNode & ChildrenMixin
  ): Promise<void> {
    const children = this.prepareChildren(nodeData);
    for (const entry of children) {
      const childNode = await this.nodeBuilder.createNode(entry.data);
      if (!childNode) continue;

      if (entry.meta.pseudo) {
        this.safeSetPluginData(childNode, "pseudoElement", entry.meta.pseudo);
      }

      parent.appendChild(childNode);
      this.stats.elements++;

      if (this.shouldRecurse(childNode, entry.data)) {
        await this.buildChildren(
          entry.data,
          childNode as BaseNode & ChildrenMixin
        );
      }
    }
  }

  private shouldRecurse(node: SceneNode, data: any): boolean {
    const hasChildren =
      Array.isArray(data.children) && data.children.length > 0;
    const hasPseudo =
      data.pseudoElements &&
      (data.pseudoElements.before || data.pseudoElements.after);
    return "children" in node && (hasChildren || hasPseudo);
  }

  private prepareChildren(
    nodeData: any
  ): Array<{
    data: any;
    meta: { index: number; pseudo?: "before" | "after" };
  }> {
    const entries: Array<{
      data: any;
      meta: { index: number; pseudo?: "before" | "after" };
    }> = [];
    const children = Array.isArray(nodeData.children) ? nodeData.children : [];

    children.forEach((child: any, index: number) => {
      entries.push({ data: child, meta: { index } });
    });

    if (nodeData.pseudoElements?.before) {
      entries.push({
        data: this.cloneNodeData(nodeData.pseudoElements.before),
        meta: { index: -1, pseudo: "before" },
      });
    }

    if (nodeData.pseudoElements?.after) {
      entries.push({
        data: this.cloneNodeData(nodeData.pseudoElements.after),
        meta: { index: Number.MAX_SAFE_INTEGER, pseudo: "after" },
      });
    }

    const compare = (
      a: { data: any; meta: { index: number; pseudo?: "before" | "after" } },
      b: { data: any; meta: { index: number; pseudo?: "before" | "after" } }
    ) => {
      const pseudoWeight = (value?: "before" | "after") =>
        value === "before" ? -1 : value === "after" ? 1 : 0;
      const pseudoDiff =
        pseudoWeight(a.meta.pseudo) - pseudoWeight(b.meta.pseudo);
      if (pseudoDiff !== 0) return pseudoDiff;

      const zA = a.data?.zIndex ?? 0;
      const zB = b.data?.zIndex ?? 0;
      if (zA !== zB) return zA - zB;

      const orderA = a.data?.order ?? 0;
      const orderB = b.data?.order ?? 0;
      if (orderA !== orderB) return orderA - orderB;

      return a.meta.index - b.meta.index;
    };

    entries.sort(compare);
    return entries;
  }

  private cloneNodeData(node: any): any {
    if (!node) return null;
    const globalClone = (globalThis as any).structuredClone;
    if (typeof globalClone === "function") {
      return globalClone(node);
    }
    return JSON.parse(JSON.stringify(node));
  }

  private safeSetPluginData(node: SceneNode, key: string, value: string) {
    try {
      node.setPluginData(key, value);
    } catch {
      // ignore
    }
  }

  private attemptAutoLayoutUpgrade(node: SceneNode, data: any) {
    if (!this.options.applyAutoLayout) return;
    if (!data?.autoLayout || data.autoLayout.layoutMode === "NONE") return;
    if (node.type !== "FRAME" && node.type !== "GROUP") return;
    if (!node.children || node.children.length === 0) return;

    try {
      upgradeToAutoLayout(node as FrameNode | GroupNode);
    } catch (error) {
      console.warn(`Auto Layout upgrade failed for node "${node.name}"`, error);
    }
  }

  private async createComponentsLibrary(): Promise<FrameNode | null> {
    const components = this.data.components?.components;
    if (!components || Object.keys(components).length === 0) return null;

    const frame = figma.createFrame();
    frame.name = "🧩 Components Library";
    frame.layoutMode = "VERTICAL";
    frame.primaryAxisSizingMode = "AUTO";
    frame.counterAxisSizingMode = "AUTO";
    frame.itemSpacing = 40;
    frame.paddingTop = frame.paddingBottom = 40;
    frame.paddingLeft = frame.paddingRight = 40;
    frame.fills = [{ type: "SOLID", color: { r: 0.98, g: 0.98, b: 0.98 } }];

    for (const [id, componentDefRaw] of Object.entries(components)) {
      const componentDef = componentDefRaw as any;
      const componentNode = await this.nodeBuilder.createNode(
        componentDef.baseNode
      );
      if (componentNode) {
        const component = figma.createComponent();
        component.name = componentDef.name;
        component.resize(componentNode.width, componentNode.height);

        if ("children" in componentNode) {
          for (const child of [...componentNode.children]) {
            component.appendChild(child);
          }
        }

        componentNode.remove();
        frame.appendChild(component);
      }
    }

    return frame;
  }

  getStats() {
    return this.stats;
  }

  private async notifyAgentRunner(summary: any) {
    try {
      // We can't use fetch directly in the plugin sandbox if the domain isn't allowed,
      // but localhost usually works if the plugin is configured correctly.
      // Alternatively, we can post a message to the UI to handle the fetch.
      // For now, let's try posting to the UI to handle the network request,
      // as the sandbox network access might be restricted.
      figma.ui.postMessage({
        type: "report-to-runner",
        summary,
      });
      console.log("📨 Sent build summary to UI for reporting");
    } catch (err) {
      console.error("Failed to notify agent runner:", err);
    }
  }
}
