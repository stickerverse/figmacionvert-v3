/**
 * Enhanced ComponentManager with fingerprint-based repetition detection
 * Automatically detects repeated UI patterns and creates components/instances
 */
export class ComponentManager {
  private components: Map<string, ComponentNode> = new Map();
  private signatureMap: Map<string, ComponentNode> = new Map();
  private fingerprintMap: Map<string, { node: ComponentNode; count: number }> =
    new Map();
  private nodeFingerprints: Map<string, string> = new Map(); // nodeId -> fingerprint

  // Minimum times a pattern must repeat to become a component
  private readonly MIN_REPETITIONS = 2;

  constructor(private componentRegistry: any) {}

  registerComponent(id: string, component: ComponentNode): void {
    this.components.set(id, component);
  }

  getComponent(id: string): ComponentNode | undefined {
    return this.components.get(id);
  }

  hasComponent(id: string): boolean {
    return this.components.has(id);
  }

  registerSignature(signature: string, component: ComponentNode): void {
    if (!signature) return;
    this.signatureMap.set(signature, component);
  }

  getComponentBySignature(
    signature: string | undefined
  ): ComponentNode | undefined {
    if (!signature) return undefined;
    return this.signatureMap.get(signature);
  }

  /**
   * Generate a fingerprint for a node based on structure and key styles
   * This captures the "shape" of a UI element for deduplication
   */
  generateFingerprint(nodeData: any): string {
    const parts: string[] = [];

    // Type
    parts.push(nodeData.type || "FRAME");

    // Structure: child count and types
    const children = nodeData.children || [];
    parts.push(`c:${children.length}`);
    if (children.length > 0 && children.length <= 10) {
      parts.push(children.map((c: any) => c.type || "F").join("-"));
    }

    // Layout mode
    if (nodeData.layoutMode) {
      parts.push(`L:${nodeData.layoutMode}`);
    }

    // Approximate dimensions (bucketed to allow small variance)
    const w = nodeData.layout?.width || 0;
    const h = nodeData.layout?.height || 0;
    parts.push(`d:${Math.round(w / 10) * 10}x${Math.round(h / 10) * 10}`);

    // Fill type (not specific colors)
    if (nodeData.fills?.length > 0) {
      parts.push(`f:${nodeData.fills.map((f: any) => f.type).join(",")}`);
    }

    // Border radius presence
    if (nodeData.cornerRadius) {
      parts.push("r:1");
    }

    // Has text children
    const hasText = children.some((c: any) => c.type === "TEXT");
    if (hasText) parts.push("T");

    // Has image children
    const hasImage = children.some((c: any) => c.type === "IMAGE");
    if (hasImage) parts.push("I");

    return parts.join("|");
  }

  /**
   * Register a node by its fingerprint for pattern detection
   * Returns the master component if this is a repeated pattern
   */
  registerByFingerprint(nodeId: string, nodeData: any): ComponentNode | null {
    const fingerprint = this.generateFingerprint(nodeData);
    this.nodeFingerprints.set(nodeId, fingerprint);

    const existing = this.fingerprintMap.get(fingerprint);
    if (existing) {
      existing.count++;
      // Return master component if threshold met
      if (existing.count >= this.MIN_REPETITIONS) {
        return existing.node;
      }
    } else {
      // First occurrence - don't create component yet
      this.fingerprintMap.set(fingerprint, { node: null as any, count: 1 });
    }
    return null;
  }

  /**
   * Promote a node to be the master component for its fingerprint
   */
  promoteToMasterComponent(
    fingerprint: string,
    component: ComponentNode
  ): void {
    const entry = this.fingerprintMap.get(fingerprint);
    if (entry) {
      entry.node = component;
      this.signatureMap.set(fingerprint, component);
    }
  }

  /**
   * Get fingerprint for a node
   */
  getFingerprint(nodeId: string): string | undefined {
    return this.nodeFingerprints.get(nodeId);
  }

  /**
   * Get master component for a fingerprint
   */
  getMasterByFingerprint(fingerprint: string): ComponentNode | undefined {
    return this.fingerprintMap.get(fingerprint)?.node;
  }

  /**
   * Get detection stats for logging
   */
  getStats(): {
    components: number;
    signatures: number;
    fingerprints: number;
    repeatedPatterns: number;
  } {
    const repeatedPatterns = Array.from(this.fingerprintMap.values()).filter(
      (v) => v.count >= this.MIN_REPETITIONS
    ).length;
    return {
      components: this.components.size,
      signatures: this.signatureMap.size,
      fingerprints: this.fingerprintMap.size,
      repeatedPatterns,
    };
  }
}
