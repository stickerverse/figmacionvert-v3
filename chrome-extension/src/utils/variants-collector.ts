import {
  VariantData,
  ElementNode,
  ComponentRegistry,
  VariantSet,
} from "../types/schema";

/**
 * Variants Collector
 *
 * Aggregates captured interactive states into variant sets and prepares them
 * for Figma's variant frame system.
 */

export interface VariantsRegistry {
  variants: Record<string, VariantSet>;
  statistics: {
    totalVariants: number;
    elementsWithVariants: number;
    statesPerElement: { [state: string]: number };
  };
}

export interface VariantCollectionProgress {
  phase: "analyzing" | "grouping" | "optimizing" | "complete";
  message: string;
  processed?: number;
  total?: number;
}

type ProgressCallback = (progress: VariantCollectionProgress) => void;

export class VariantsCollector {
  private progressCallback?: ProgressCallback;
  private visitedElements = new WeakSet<Element>();

  setProgressCallback(callback: ProgressCallback) {
    this.progressCallback = callback;
  }

  private reportProgress(
    phase: VariantCollectionProgress["phase"],
    message: string,
    processed?: number,
    total?: number
  ) {
    if (this.progressCallback) {
      this.progressCallback({
        phase,
        message,
        processed,
        total,
      });
    }
  }

  /**
   * Collect and organize captured states into variant registry
   */
  async collectVariants(
    stateCaptures: Map<Element, VariantData[]>,
    elementNodes: Map<Element, ElementNode>,
    componentRegistry?: ComponentRegistry
  ): Promise<VariantsRegistry> {
    this.reportProgress("analyzing", "Analyzing captured states...");

    const variantsRegistry: VariantsRegistry = {
      variants: {},
      statistics: {
        totalVariants: 0,
        elementsWithVariants: 0,
        statesPerElement: {
          default: 0,
          hover: 0,
          focus: 0,
          active: 0,
          disabled: 0,
        },
      },
    };

    const entries = Array.from(stateCaptures.entries());

    this.reportProgress(
      "grouping",
      "Grouping variants by element...",
      0,
      entries.length
    );

    for (let i = 0; i < entries.length; i++) {
      // Yield to main thread every 5 elements to prevent blocking
      if (i % 5 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const [element, variants] = entries[i];

      // Skip if no meaningful variants captured
      if (!this.hasSignificantVariants(variants)) {
        continue;
      }

      const elementNode = elementNodes.get(element);
      if (!elementNode) {
        continue;
      }

      // Prevent circular reference issues
      if (this.visitedElements.has(element)) {
        continue;
      }
      this.visitedElements.add(element);

      const variantSet = this.createVariantSet(
        element,
        variants,
        elementNode,
        componentRegistry
      );
      variantsRegistry.variants[variantSet.elementId] = variantSet;

      // Update statistics
      variantsRegistry.statistics.totalVariants += variants.length;
      variantsRegistry.statistics.elementsWithVariants++;

      variants.forEach((variant) => {
        variantsRegistry.statistics.statesPerElement[variant.state]++;
      });

      this.reportProgress(
        "grouping",
        "Grouping variants by element...",
        i + 1,
        entries.length
      );
    }

    this.reportProgress("optimizing", "Optimizing variant data...");
    await this.optimizeVariants(variantsRegistry);

    this.reportProgress(
      "complete",
      `Collected ${variantsRegistry.statistics.totalVariants} variants for ${variantsRegistry.statistics.elementsWithVariants} elements`
    );

    console.log(
      "📊 Variants collection statistics:",
      variantsRegistry.statistics
    );
    return variantsRegistry;
  }

  /**
   * Check if captured variants contain significant differences
   */
  private hasSignificantVariants(variants: VariantData[]): boolean {
    if (variants.length <= 1) {
      return false;
    }

    const defaultVariant = variants.find((v) => v.state === "default");
    if (!defaultVariant) {
      return false;
    }

    // Check if any non-default variant has meaningful differences
    const otherVariants = variants.filter((v) => v.state !== "default");

    return otherVariants.some((variant) => {
      return this.hasSignificantDifferences(
        defaultVariant.properties,
        variant.properties
      );
    });
  }

  /**
   * Check if two property sets have significant visual differences
   */
  private hasSignificantDifferences(
    props1: Partial<ElementNode>,
    props2: Partial<ElementNode>
  ): boolean {
    // Check fill differences
    if (this.hasDifferentFills(props1.fills, props2.fills)) {
      return true;
    }

    // Check stroke differences
    if (this.hasDifferentStrokes(props1.strokes, props2.strokes)) {
      return true;
    }

    // Check effect differences
    if (this.hasDifferentEffects(props1.effects, props2.effects)) {
      return true;
    }

    // Check opacity differences
    if (Math.abs((props1.opacity || 1) - (props2.opacity || 1)) > 0.01) {
      return true;
    }

    // Check corner radius differences
    if (
      this.hasDifferentCornerRadius(props1.cornerRadius, props2.cornerRadius)
    ) {
      return true;
    }

    return false;
  }

  /**
   * Check if fills are meaningfully different
   */
  private hasDifferentFills(fills1?: any[], fills2?: any[]): boolean {
    if (!fills1 && !fills2) return false;
    if (!fills1 || !fills2) return true;
    if (fills1.length !== fills2.length) return true;

    return fills1.some((fill1, index) => {
      const fill2 = fills2[index];
      if (!fill2) return true;

      if (fill1.type !== fill2.type) return true;

      if (fill1.color && fill2.color) {
        const colorDiff =
          Math.abs(fill1.color.r - fill2.color.r) +
          Math.abs(fill1.color.g - fill2.color.g) +
          Math.abs(fill1.color.b - fill2.color.b) +
          Math.abs(fill1.color.a - fill2.color.a);
        if (colorDiff > 0.02) return true; // 2% color threshold
      }

      return false;
    });
  }

  /**
   * Check if strokes are meaningfully different
   */
  private hasDifferentStrokes(strokes1?: any[], strokes2?: any[]): boolean {
    if (!strokes1 && !strokes2) return false;
    if (!strokes1 || !strokes2) return true;
    if (strokes1.length !== strokes2.length) return true;

    return strokes1.some((stroke1, index) => {
      const stroke2 = strokes2[index];
      if (!stroke2) return true;

      if (Math.abs(stroke1.thickness - stroke2.thickness) > 0.5) return true;

      if (stroke1.color && stroke2.color) {
        const colorDiff =
          Math.abs(stroke1.color.r - stroke2.color.r) +
          Math.abs(stroke1.color.g - stroke2.color.g) +
          Math.abs(stroke1.color.b - stroke2.color.b) +
          Math.abs(stroke1.color.a - stroke2.color.a);
        if (colorDiff > 0.02) return true;
      }

      return false;
    });
  }

  /**
   * Check if effects are meaningfully different
   */
  private hasDifferentEffects(effects1?: any[], effects2?: any[]): boolean {
    if (!effects1 && !effects2) return false;
    if (!effects1 || !effects2) return true;
    return effects1.length !== effects2.length;
  }

  /**
   * Check if corner radius values are meaningfully different
   */
  private hasDifferentCornerRadius(radius1?: any, radius2?: any): boolean {
    if (!radius1 && !radius2) return false;
    if (!radius1 || !radius2) return true;

    if (typeof radius1 === "number" && typeof radius2 === "number") {
      return Math.abs(radius1 - radius2) > 1; // 1px threshold
    }

    return false;
  }

  /**
   * Create a variant set for an element
   */
  private createVariantSet(
    element: Element,
    variants: VariantData[],
    elementNode: ElementNode,
    componentRegistry?: ComponentRegistry
  ): VariantSet {
    const tagName = element.tagName.toLowerCase();
    const selector = this.generateElementSelector(element);

    // Determine interaction types based on available variants
    const interactionTypes: string[] = [];
    const stateTypes = variants.map((v) => v.state);

    if (stateTypes.includes("hover")) interactionTypes.push("hover");
    if (stateTypes.includes("focus")) interactionTypes.push("focus");
    if (stateTypes.includes("active")) interactionTypes.push("click");
    if (stateTypes.includes("disabled")) interactionTypes.push("disabled");

    // Sort variants by state priority (default first, then hover, focus, active, disabled)
    const statePriority = {
      default: 0,
      hover: 1,
      focus: 2,
      active: 3,
      disabled: 4,
    };
    const sortedVariants = [...variants].sort(
      (a, b) => (statePriority[a.state] || 99) - (statePriority[b.state] || 99)
    );

    const variantSet: VariantSet = {
      elementId: elementNode.id,
      componentId: elementNode.componentId || elementNode.id,
      variants: sortedVariants,
      metadata: {
        tagName,
        selector,
        interactionTypes,
        variantAxes: ["state"],
      },
    };

    // Ensure all variants have axes populated
    variantSet.variants.forEach((v) => {
      if (!v.axes) {
        v.axes = { state: v.state };
      }
    });

    return variantSet;
  }

  /**
   * Generate a CSS selector for an element
   */
  private generateElementSelector(element: Element): string {
    let selector = element.tagName.toLowerCase();

    if (element.id) {
      selector += `#${element.id}`;
    }

    if (element.className) {
      const classes = element.className
        .split(" ")
        .filter((c) => c && !c.startsWith("figma-temp-"))
        .slice(0, 3); // Limit to first 3 classes to avoid overly long selectors

      if (classes.length > 0) {
        selector += "." + classes.join(".");
      }
    }

    return selector;
  }

  /**
   * Optimize variant data by removing redundant information
   */
  private async optimizeVariants(registry: VariantsRegistry) {
    const variantSets = Object.values(registry.variants);

    for (let i = 0; i < variantSets.length; i++) {
      const variantSet = variantSets[i];

      // Yield every 10 sets
      if (i % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      // Remove properties that are identical to default state
      const defaultVariant = variantSet.variants.find(
        (v) => v.state === "default"
      );
      if (!defaultVariant) continue;

      const otherVariants = variantSet.variants.filter(
        (v) => v.state !== "default"
      );

      for (const variant of otherVariants) {
        variant.properties = this.removeRedundantProperties(
          defaultVariant.properties,
          variant.properties
        );
      }

      // Remove variants with no meaningful differences
      variantSet.variants = variantSet.variants.filter((variant) => {
        if (variant.state === "default") return true;
        return Object.keys(variant.properties).length > 0;
      });
    }

    // Update statistics after optimization
    registry.statistics.totalVariants = 0;
    registry.statistics.elementsWithVariants = 0;
    registry.statistics.statesPerElement = {
      default: 0,
      hover: 0,
      focus: 0,
      active: 0,
      disabled: 0,
    };

    for (const variantSet of variantSets) {
      if (variantSet.variants.length > 1) {
        registry.statistics.elementsWithVariants++;
        registry.statistics.totalVariants += variantSet.variants.length;

        variantSet.variants.forEach((variant) => {
          registry.statistics.statesPerElement[variant.state]++;
        });
      } else {
        // Remove variant sets with only default state
        delete registry.variants[variantSet.elementId];
      }
    }
  }

  /**
   * Remove properties from variant that are identical to default
   */
  private removeRedundantProperties(
    defaultProps: Partial<ElementNode>,
    variantProps: Partial<ElementNode>
  ): Partial<ElementNode> {
    const optimized: Partial<ElementNode> = {};

    for (const [key, value] of Object.entries(variantProps)) {
      const defaultValue = (defaultProps as any)[key];

      // Keep property if it's different from default
      if (!this.arePropertiesEqual(defaultValue, value)) {
        (optimized as any)[key] = value;
      }
    }

    return optimized;
  }

  /**
   * Deep comparison of property values
   */
  private arePropertiesEqual(value1: any, value2: any): boolean {
    if (value1 === value2) return true;
    if (!value1 || !value2) return false;

    if (typeof value1 !== typeof value2) return false;

    if (typeof value1 === "object") {
      return JSON.stringify(value1) === JSON.stringify(value2);
    }

    return false;
  }

  /**
   * Get summary of collected variants
   */
  static generateVariantsSummary(registry: VariantsRegistry): string {
    const { statistics } = registry;

    let summary = `🎭 Interactive States Summary:\n`;
    summary += `• Elements with variants: ${statistics.elementsWithVariants}\n`;
    summary += `• Total variants: ${statistics.totalVariants}\n`;
    summary += `• States breakdown:\n`;

    Object.entries(statistics.statesPerElement).forEach(([state, count]) => {
      if (count > 0) {
        summary += `  - ${state}: ${count} elements\n`;
      }
    });

    const mostCommonState = Object.entries(statistics.statesPerElement)
      .filter(([state]) => state !== "default")
      .sort(([, a], [, b]) => b - a)[0];

    if (mostCommonState) {
      summary += `• Most common interactive state: ${mostCommonState[0]} (${mostCommonState[1]} elements)\n`;
    }

    return summary.trim();
  }
}
