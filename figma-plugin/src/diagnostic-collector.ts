// figma-plugin/src/diagnostic-collector.ts
// Runtime diagnostic collection for pixel-perfect fidelity debugging

import type {
  PipelinePhase,
  RasterizationReason,
  CaptureMethod,
  RasterizationAttempt,
  RasterizationAudit,
  NodePipelineStatus,
  SchemaMappingVerification,
  LayoutSolverDecision,
  NodeDiagnostic,
  ImportDiagnosticSummary,
  ImportDiagnosticExport,
  AnalyzedNode,
} from "../../shared/schema";

/**
 * DiagnosticCollector - Centralized runtime tracking for import fidelity debugging
 *
 * Usage:
 * 1. Create instance at start of import: `const diagnostics = new DiagnosticCollector(schema.url)`
 * 2. Track phases during node building: `diagnostics.recordPhase(nodeId, "FILLS_APPLIED")`
 * 3. Record rasterization attempts: `diagnostics.recordRasterization(...)`
 * 4. Verify mappings after creation: `diagnostics.verifyMapping(...)`
 * 5. Export results: `const report = diagnostics.export()`
 */
export class DiagnosticCollector {
  private importId: string;
  private sourceUrl: string;
  private startTime: number;
  private nodeTracking = new Map<string, NodeTracking>();
  private performanceMetrics = {
    nodeCount: 0,
    rasterizationTimeMs: 0,
    layoutSolverTimeMs: 0,
  };

  constructor(sourceUrl: string) {
    this.importId = `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.sourceUrl = sourceUrl;
    this.startTime = Date.now();
  }

  /**
   * Initialize tracking for a node
   */
  initNode(schemaNodeId: string): void {
    if (!this.nodeTracking.has(schemaNodeId)) {
      this.nodeTracking.set(schemaNodeId, {
        schemaNodeId,
        figmaNodeId: null,
        phases: [],
        rasterization: null,
        mapping: null,
        layout: null,
        warnings: [],
        errors: [],
        startTime: Date.now(),
      });
      this.performanceMetrics.nodeCount++;
    }
  }

  /**
   * Record completion of a pipeline phase
   */
  recordPhase(schemaNodeId: string, phase: PipelinePhase): void {
    const tracking = this.getOrCreateTracking(schemaNodeId);
    if (!tracking.phases.includes(phase)) {
      tracking.phases.push(phase);
    }

    // Auto-detect early returns: if we see TRANSFORM_APPLIED but never see FILLS_APPLIED
    if (phase === "COMPLETE") {
      this.detectEarlyReturn(schemaNodeId);
    }
  }

  /**
   * Record Figma node ID after creation
   */
  setFigmaNodeId(schemaNodeId: string, figmaNodeId: string): void {
    const tracking = this.getOrCreateTracking(schemaNodeId);
    tracking.figmaNodeId = figmaNodeId;
  }

  /**
   * Record rasterization attempt and audit trail
   */
  recordRasterization(
    schemaNodeId: string,
    reason: RasterizationReason,
    cssFeatures: string[],
    attempt: RasterizationAttempt
  ): void {
    const tracking = this.getOrCreateTracking(schemaNodeId);

    if (!tracking.rasterization) {
      tracking.rasterization = {
        nodeId: schemaNodeId,
        reason,
        cssFeatures,
        attempts: [],
        finalMethod: null,
        fallbackChain: [],
      };
    }

    tracking.rasterization.attempts.push(attempt);
    tracking.rasterization.fallbackChain.push(attempt.method);

    if (attempt.success) {
      tracking.rasterization.finalMethod = attempt.method;
    }

    // Track performance
    const attemptDuration = Date.now() - attempt.timestamp;
    this.performanceMetrics.rasterizationTimeMs += attemptDuration;
  }

  /**
   * Verify schema-to-Figma mapping after node creation
   */
  verifyMapping(
    schemaNodeId: string,
    schemaNode: AnalyzedNode,
    figmaNode: SceneNode | null
  ): void {
    const tracking = this.getOrCreateTracking(schemaNodeId);

    const expectedFills = schemaNode.fills?.length ?? 0;
    const expectedStrokes = schemaNode.strokes?.length ?? 0;
    const expectedChildren = schemaNode.children?.length ?? 0;
    const expectedEffects = this.countExpectedEffects(schemaNode);

    let actualFills = 0;
    let actualStrokes = 0;
    let actualEffects = 0;
    let actualChildren = 0;
    let actualDimensions: { width: number; height: number } | undefined;
    let figmaType: string | null = null;

    if (figmaNode) {
      figmaType = figmaNode.type;

      if ("fills" in figmaNode) {
        actualFills = (figmaNode.fills as readonly Paint[])?.length ?? 0;
      }
      if ("strokes" in figmaNode) {
        actualStrokes = (figmaNode.strokes as readonly Paint[])?.length ?? 0;
      }
      if ("effects" in figmaNode) {
        actualEffects = (figmaNode.effects as readonly Effect[])?.length ?? 0;
      }
      if ("children" in figmaNode) {
        actualChildren = (figmaNode as ChildrenMixin).children?.length ?? 0;
      }
      if ("width" in figmaNode && "height" in figmaNode) {
        actualDimensions = {
          width: (figmaNode as LayoutMixin).width,
          height: (figmaNode as LayoutMixin).height,
        };
      }
    }

    const countMismatches: string[] = [];
    if (expectedFills !== actualFills) countMismatches.push("fills");
    if (expectedStrokes !== actualStrokes) countMismatches.push("strokes");
    if (expectedEffects !== actualEffects) countMismatches.push("effects");
    if (expectedChildren !== actualChildren) countMismatches.push("children");

    const dimensionMismatch = actualDimensions
      ? Math.abs(actualDimensions.width - schemaNode.rect.width) > 1 ||
        Math.abs(actualDimensions.height - schemaNode.rect.height) > 1
      : false;

    tracking.mapping = {
      schemaNodeId,
      figmaNodeId: figmaNode?.id ?? null,
      schemaType: schemaNode.tagName,
      figmaType,
      expectedDimensions: {
        width: schemaNode.rect.width,
        height: schemaNode.rect.height,
      },
      actualDimensions,
      transformApplied: tracking.phases.includes("TRANSFORM_APPLIED"),
      fillsCount: { expected: expectedFills, actual: actualFills },
      strokesCount: { expected: expectedStrokes, actual: actualStrokes },
      effectsCount: { expected: expectedEffects, actual: actualEffects },
      childrenCount: { expected: expectedChildren, actual: actualChildren },
      dimensionMismatch,
      countMismatches,
    };

    // Auto-detect white blank frames
    if (figmaNode && actualFills === 0 && expectedFills > 0) {
      tracking.warnings.push("WHITE_BLANK_FRAME: Expected fills but none applied");
    }

    // Auto-detect dimension mismatches
    if (dimensionMismatch) {
      tracking.warnings.push(
        `DIMENSION_MISMATCH: Expected ${schemaNode.rect.width}x${schemaNode.rect.height}, got ${actualDimensions?.width}x${actualDimensions?.height}`
      );
    }
  }

  /**
   * Record layout solver decision
   */
  recordLayoutDecision(
    schemaNodeId: string,
    cssLayoutMode: string,
    inferredLayoutMode: "HORIZONTAL" | "VERTICAL" | "NONE",
    autoLayoutApplied: boolean,
    autoLayoutProperties?: LayoutSolverDecision["autoLayoutProperties"],
    fallbackReason?: string
  ): void {
    const tracking = this.getOrCreateTracking(schemaNodeId);

    tracking.layout = {
      nodeId: schemaNodeId,
      cssLayoutMode,
      inferredLayoutMode,
      autoLayoutApplied,
      autoLayoutProperties,
      fallbackReason,
    };
  }

  /**
   * Record warning message
   */
  warn(schemaNodeId: string, message: string): void {
    const tracking = this.getOrCreateTracking(schemaNodeId);
    tracking.warnings.push(message);
  }

  /**
   * Record error message
   */
  error(schemaNodeId: string, message: string): void {
    const tracking = this.getOrCreateTracking(schemaNodeId);
    tracking.errors.push(message);
  }

  /**
   * Export complete diagnostic report
   */
  export(): ImportDiagnosticExport {
    const totalDurationMs = Date.now() - this.startTime;
    const nodeDetails: NodeDiagnostic[] = [];
    const summary: ImportDiagnosticSummary = {
      totalNodes: this.performanceMetrics.nodeCount,
      successfulNodes: 0,
      failedNodes: [],
      whiteBlankFrames: [],
      rasterizedNodes: 0,
      autoLayoutNodes: 0,
      transformedNodes: 0,
      earlyReturns: [],
      criticalFailures: 0,
    };

    for (const [nodeId, tracking] of this.nodeTracking.entries()) {
      const pipelineStatus: NodePipelineStatus = {
        schemaNodeId: nodeId,
        figmaNodeId: tracking.figmaNodeId,
        completedPhases: tracking.phases,
        failedAt: this.determineFailurePoint(tracking),
        earlyReturnDetected: this.isEarlyReturn(tracking),
        completionTimestamp: tracking.startTime,
        errorMessages: tracking.errors,
      };

      const diagnostic: NodeDiagnostic = {
        nodeId,
        pipelineStatus,
        mappingVerification: tracking.mapping ?? undefined,
        rasterizationAudit: tracking.rasterization ?? undefined,
        layoutDecision: tracking.layout ?? undefined,
        warnings: tracking.warnings,
        errors: tracking.errors,
      };

      nodeDetails.push(diagnostic);

      // Update summary
      if (tracking.phases.includes("COMPLETE")) {
        summary.successfulNodes++;
      } else {
        summary.failedNodes.push(nodeId);
      }

      if (tracking.mapping?.fillsCount.actual === 0 && tracking.mapping?.fillsCount.expected > 0) {
        summary.whiteBlankFrames.push(nodeId);
      }

      if (tracking.rasterization) {
        summary.rasterizedNodes++;
      }

      if (tracking.layout?.autoLayoutApplied) {
        summary.autoLayoutNodes++;
      }

      if (tracking.phases.includes("TRANSFORM_APPLIED")) {
        summary.transformedNodes++;
      }

      if (this.isEarlyReturn(tracking)) {
        summary.earlyReturns.push(nodeId);
      }

      if (tracking.errors.length > 0) {
        summary.criticalFailures++;
      }
    }

    return {
      importId: this.importId,
      timestamp: new Date().toISOString(),
      schemaVersion: "v2",
      sourceUrl: this.sourceUrl,
      summary,
      nodeDetails,
      performanceMetrics: {
        totalImportDurationMs: totalDurationMs,
        averageNodeBuildTimeMs:
          this.performanceMetrics.nodeCount > 0
            ? totalDurationMs / this.performanceMetrics.nodeCount
            : 0,
        rasterizationTimeMs: this.performanceMetrics.rasterizationTimeMs,
        layoutSolverTimeMs: this.performanceMetrics.layoutSolverTimeMs,
      },
      systemInfo: {
        figmaVersion: "unknown", // figma.version is not available in plugin API
        pluginVersion: "1.0.0", // TODO: Read from package.json or manifest
        platform: "figma-plugin",
      },
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private getOrCreateTracking(schemaNodeId: string): NodeTracking {
    if (!this.nodeTracking.has(schemaNodeId)) {
      this.initNode(schemaNodeId);
    }
    return this.nodeTracking.get(schemaNodeId)!;
  }

  private countExpectedEffects(node: AnalyzedNode): number {
    let count = 0;

    // Count CSS filters
    if (node.cssFilter) {
      // Parse filter string to count individual effects
      const filters = node.cssFilter.split(/\)\s+(?=[a-z])/);
      count += filters.length;
    }

    // Other effect sources could be counted here
    return count;
  }

  private detectEarlyReturn(schemaNodeId: string): void {
    const tracking = this.nodeTracking.get(schemaNodeId);
    if (!tracking) return;

    // Early return detected if we applied transform but never applied fills
    if (
      tracking.phases.includes("TRANSFORM_APPLIED") &&
      !tracking.phases.includes("FILLS_APPLIED")
    ) {
      tracking.warnings.push(
        "EARLY_RETURN: Transform applied but fills never applied - possible early return in pipeline"
      );
    }
  }

  private isEarlyReturn(tracking: NodeTracking): boolean {
    // Check if critical phases were skipped
    const hasTransform = tracking.phases.includes("TRANSFORM_APPLIED");
    const hasFills = tracking.phases.includes("FILLS_APPLIED");
    const hasChildren = tracking.phases.includes("CHILDREN_PROCESSED");
    const isComplete = tracking.phases.includes("COMPLETE");

    return hasTransform && (!hasFills || !hasChildren) && !isComplete;
  }

  private determineFailurePoint(tracking: NodeTracking): PipelinePhase | undefined {
    const allPhases: PipelinePhase[] = [
      "CREATED",
      "PARENTED",
      "RESIZED",
      "TRANSFORM_APPLIED",
      "FILTERS_APPLIED",
      "FILLS_APPLIED",
      "STROKES_APPLIED",
      "EFFECTS_APPLIED",
      "CHILDREN_PROCESSED",
      "COMPLETE",
    ];

    // Find the first phase that wasn't completed
    for (let i = 0; i < allPhases.length; i++) {
      if (!tracking.phases.includes(allPhases[i])) {
        return allPhases[i];
      }
    }

    return undefined;
  }
}

// ============================================================================
// Internal Types
// ============================================================================

interface NodeTracking {
  schemaNodeId: string;
  figmaNodeId: string | null;
  phases: PipelinePhase[];
  rasterization: RasterizationAudit | null;
  mapping: SchemaMappingVerification | null;
  layout: LayoutSolverDecision | null;
  warnings: string[];
  errors: string[];
  startTime: number;
}
