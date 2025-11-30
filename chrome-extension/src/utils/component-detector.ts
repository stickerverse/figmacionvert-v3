import { ElementNode } from '../types/schema';

/**
 * Visual fingerprint for component similarity analysis
 * Contains key visual properties that define an element's appearance
 */
export interface VisualFingerprint {
  // Layout properties
  dimensions: { width: number; height: number };
  aspectRatio: number;
  hasFixedDimensions: boolean;
  
  // Typography properties
  typography: {
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    lineHeight: number;
    textAlign: string;
  } | null;
  
  // Color properties
  colors: {
    background: string | null;
    text: string | null;
    border: string | null;
    shadowColor: string | null;
  };
  
  // Visual styling
  styling: {
    borderRadius: number;
    borderWidth: number;
    hasShadow: boolean;
    hasGradient: boolean;
    opacity: number;
  };
  
  // Layout context
  layout: {
    display: string;
    position: string;
    flexDirection?: string;
    justifyContent?: string;
    alignItems?: string;
    gap?: number;
  };
}

/**
 * Semantic analysis of HTML elements
 */
export interface SemanticFingerprint {
  // Basic HTML semantics
  tagName: string;
  elementType: string;
  
  // Accessibility and roles
  role: string | null;
  ariaLabel: string | null;
  ariaRole: string | null;
  isInteractive: boolean;
  
  // Content structure
  hasText: boolean;
  hasImage: boolean;
  childCount: number;
  nestingLevel: number;
}

/**
 * Component similarity result
 */
export interface ComponentSimilarity {
  element1: Element;
  element2: Element;
  node1: ElementNode;
  node2: ElementNode;
  
  // Similarity scores (0-1 scale)
  visualSimilarity: number;
  semanticSimilarity: number;
  structuralSimilarity: number;
  overallSimilarity: number;
  
  // Detailed scoring breakdown
  scoreBreakdown: {
    layout: number;
    colors: number;
    typography: number;
    styling: number;
    semantics: number;
    structure: number;
  };
}

/**
 * Component group with detected instances
 */
export interface ComponentGroup {
  id: string;
  name: string;
  pattern: string;
  similarity: number;
  instances: Array<{
    element: Element;
    node: ElementNode;
    confidence: number;
  }>;
  baseFingerprint: VisualFingerprint;
  semanticType: string;
}

/**
 * Enhanced component detector using visual similarity analysis
 * Matches html.to.design's capabilities for detecting visually similar components
 * even when HTML structure differs
 */
export class ComponentDetector {
  private readonly SIMILARITY_THRESHOLD = 0.6; // Relaxed from 0.7
  private readonly MIN_INSTANCES = 2;
  
  // Weight factors for different similarity aspects
  private readonly WEIGHTS = {
    visual: 0.5,      // Visual appearance (colors, styling)
    semantic: 0.3,    // HTML semantics and accessibility
    structural: 0.2   // DOM structure and layout
  };

  private readonly VISUAL_WEIGHTS = {
    layout: 0.3,      // Dimensions, aspect ratio
    colors: 0.25,     // Background, text, border colors
    typography: 0.25, // Font properties
    styling: 0.2      // Border, shadows, effects
  };

  /**
   * Detect component patterns from a tree of ElementNodes
   */
  public async detectComponents(tree: ElementNode): Promise<{ definitions: Record<string, any> }> {
    console.log('🔍 Starting enhanced component detection with visual similarity...');
    
    const allElements = this.collectAllElements(tree);
    console.log(`📊 Analyzing ${allElements.length} elements for component patterns`);
    
    // Step 1: Detect specific UI patterns first
    const patternGroups = await this.detectUIPatterns(allElements);
    console.log(`🎨 Found ${patternGroups.size} specialized UI patterns`);
    
    // Step 2: Create smart buckets for remaining elements  
    const remainingElements = this.filterProcessedElements(allElements, patternGroups);
    const buckets = this.createSmartBuckets(remainingElements);
    console.log(`🗂️ Created ${buckets.size} smart buckets for ${remainingElements.length} remaining elements`);
    
    // Step 3: Find component groups within each bucket
    const componentGroups = new Map<string, ComponentGroup>(patternGroups);
    
    for (const [bucketKey, elements] of buckets) {
      if (elements.length < this.MIN_INSTANCES) continue;
      
      console.log(`🔍 Analyzing bucket "${bucketKey}" with ${elements.length} elements`);
      const groups = this.findComponentGroupsInBucket(elements, bucketKey);
      
      for (const group of groups) {
        componentGroups.set(group.id, group);
      }
    }
    
    // Convert to legacy component registry format
    const componentRegistry = this.convertToLegacyFormat(componentGroups);
    
    console.log(`✅ Component detection complete: found ${Object.keys(componentRegistry.definitions).length} component patterns`);
    this.logComponentSummary(componentGroups);
    
    return componentRegistry;
  }

  /**
   * Detect specialized UI patterns like cards, forms, navigation
   */
  private async detectUIPatterns(allElements: Array<{ element: Element; node: ElementNode }>): Promise<Map<string, ComponentGroup>> {
    const patternGroups = new Map<string, ComponentGroup>();
    
    // Detect card-like patterns (container + image + text + action)
    const cardPatterns = await this.detectCardPatterns(allElements);
    cardPatterns.forEach((group, key) => patternGroups.set(key, group));
    
    // Detect button patterns
    const buttonPatterns = await this.detectButtonPatterns(allElements);
    buttonPatterns.forEach((group, key) => patternGroups.set(key, group));
    
    // Detect form input patterns  
    const inputPatterns = await this.detectInputPatterns(allElements);
    inputPatterns.forEach((group, key) => patternGroups.set(key, group));
    
    // Detect navigation link patterns
    const navPatterns = await this.detectNavigationPatterns(allElements);
    navPatterns.forEach((group, key) => patternGroups.set(key, group));
    
    // Detect list item patterns
    const listPatterns = await this.detectListItemPatterns(allElements);
    listPatterns.forEach((group, key) => patternGroups.set(key, group));
    
    return patternGroups;
  }

  /**
   * Detect card-like components (image + text + optional button)
   */
  private async detectCardPatterns(allElements: Array<{ element: Element; node: ElementNode }>): Promise<Map<string, ComponentGroup>> {
    const cardCandidates = allElements.filter(({ element, node }) => {
      // Look for container elements that might be cards
      const hasImage = element.querySelector('img, svg, [style*="background-image"]') !== null;
      const hasText = element.textContent && element.textContent.trim().length > 20; // Substantial text
      const hasMultipleChildren = element.children.length >= 2;
      const reasonableSize = node.layout.width > 150 && node.layout.height > 100;
      
      return hasMultipleChildren && (hasImage || hasText) && reasonableSize;
    });
    
    return await this.groupSimilarElements(cardCandidates, 'card', 0.6); // Lower threshold for cards
  }

  /**
   * Detect button patterns
   */
  private async detectButtonPatterns(allElements: Array<{ element: Element; node: ElementNode }>): Promise<Map<string, ComponentGroup>> {
    const buttonCandidates = allElements.filter(({ element, node }) => {
      const tagName = element.tagName.toLowerCase();
      const role = element.getAttribute('role');
      const isButton = tagName === 'button' || role === 'button';
      const hasClickHandler = element.hasAttribute('onclick');
      const looksLikeButton = window.getComputedStyle(element as HTMLElement).cursor === 'pointer';
      
      const reasonableSize = node.layout.width > 50 && node.layout.height > 20;
      
      return (isButton || hasClickHandler || looksLikeButton) && reasonableSize;
    });
    
    return await this.groupSimilarElements(buttonCandidates, 'button', 0.75);
  }

  /**
   * Detect form input patterns
   */
  private async detectInputPatterns(allElements: Array<{ element: Element; node: ElementNode }>): Promise<Map<string, ComponentGroup>> {
    const inputCandidates = allElements.filter(({ element, node }) => {
      const tagName = element.tagName.toLowerCase();
      const isFormElement = ['input', 'textarea', 'select'].includes(tagName);
      const hasLabel = element.closest('label') || document.querySelector(`label[for="${element.id}"]`);
      
      return isFormElement || hasLabel;
    });
    
    return await this.groupSimilarElements(inputCandidates, 'input', 0.8);
  }

  /**
   * Detect navigation link patterns
   */
  private async detectNavigationPatterns(allElements: Array<{ element: Element; node: ElementNode }>): Promise<Map<string, ComponentGroup>> {
    const navCandidates = allElements.filter(({ element, node }) => {
      const tagName = element.tagName.toLowerCase();
      const isNavElement = tagName === 'a' && element.getAttribute('href');
      const inNavigation = element.closest('nav, [role="navigation"]');
      const isListItem = element.tagName.toLowerCase() === 'li' && element.querySelector('a');
      
      return (isNavElement && inNavigation) || (isListItem && inNavigation);
    });
    
    return await this.groupSimilarElements(navCandidates, 'navigation', 0.7);
  }

  /**
   * Detect list item patterns
   */
  private async detectListItemPatterns(allElements: Array<{ element: Element; node: ElementNode }>): Promise<Map<string, ComponentGroup>> {
    const listCandidates = allElements.filter(({ element, node }) => {
      const tagName = element.tagName.toLowerCase();
      const isListItem = tagName === 'li';
      const inList = element.closest('ul, ol');
      
      return isListItem && inList && element.textContent?.trim();
    });
    
    return await this.groupSimilarElements(listCandidates, 'list-item', 0.75);
  }

  /**
   * Group similar elements using enhanced similarity detection
   */
  private async groupSimilarElements(
    elements: Array<{ element: Element; node: ElementNode }>, 
    patternType: string, 
    threshold: number
  ): Promise<Map<string, ComponentGroup>> {
    const groups = new Map<string, ComponentGroup>();
    const processed = new Set<Element>();
    
    // Limit exhaustive O(N^2) search for very large sets to prevent freezing
    const isLargeSet = elements.length > 500;
    const maxComparisons = isLargeSet ? 50 : elements.length; // For large sets, only compare with next 50 neighbors
    
    for (let i = 0; i < elements.length; i++) {
      // Yield every 20 processed elements to keep UI responsive
      if (i % 20 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      const candidate = elements[i];
      if (processed.has(candidate.element)) continue;
      
      const similarElements = [candidate];
      processed.add(candidate.element);
      
      // Optimization: Only check a window of subsequent elements for large sets
      // This assumes similar elements are likely somewhat close in the DOM order
      const searchLimit = Math.min(elements.length, i + maxComparisons);
      
      for (let j = i + 1; j < searchLimit; j++) {
        const other = elements[j];
        if (processed.has(other.element)) continue;
        
        const similarity = this.calculateSimilarity(
          candidate.element, 
          other.element, 
          candidate.node, 
          other.node
        );
        
        if (similarity.overallSimilarity >= threshold) {
          similarElements.push(other);
          processed.add(other.element);
        }
      }
      
      if (similarElements.length >= this.MIN_INSTANCES) {
        const group = this.createPatternComponentGroup(similarElements, patternType);
        groups.set(group.id, group);
      }
    }
    
    return groups;
  }

  /**
   * Create a specialized component group for UI patterns
   */
  private createPatternComponentGroup(
    elements: Array<{ element: Element; node: ElementNode }>, 
    patternType: string
  ): ComponentGroup {
    const baseElement = elements[0];
    const baseFingerprint = this.createVisualFingerprint(baseElement.element, baseElement.node);
    
    // Calculate pattern-specific confidence
    let totalSimilarity = 0;
    let comparisons = 0;
    
    for (let i = 0; i < elements.length; i++) {
      for (let j = i + 1; j < elements.length; j++) {
        const similarity = this.calculateSimilarity(
          elements[i].element,
          elements[j].element,
          elements[i].node,
          elements[j].node
        );
        totalSimilarity += similarity.overallSimilarity;
        comparisons++;
      }
    }
    
    const avgSimilarity = comparisons > 0 ? totalSimilarity / comparisons : 1;
    
    return {
      id: `pattern-${patternType}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      name: `${patternType} pattern (${elements.length}x)`,
      pattern: `pattern.${patternType}`,
      similarity: avgSimilarity,
      instances: elements.map((item, index) => ({
        element: item.element,
        node: item.node,
        confidence: avgSimilarity
      })),
      baseFingerprint,
      semanticType: patternType
    };
  }

  /**
   * Filter out elements that have already been processed by pattern detection
   */
  private filterProcessedElements(
    allElements: Array<{ element: Element; node: ElementNode }>,
    patternGroups: Map<string, ComponentGroup>
  ): Array<{ element: Element; node: ElementNode }> {
    const processedElements = new Set<Element>();
    
    // Collect all elements that are already part of pattern groups
    for (const group of patternGroups.values()) {
      for (const instance of group.instances) {
        processedElements.add(instance.element);
      }
    }
    
    // Return elements that haven't been processed yet
    return allElements.filter(({ element }) => !processedElements.has(element));
  }

  /**
   * Create smart buckets to group similar elements and avoid O(n²) comparisons
   */
  private createSmartBuckets(elements: Array<{ element: Element; node: ElementNode }>): Map<string, Array<{ element: Element; node: ElementNode }>> {
    const buckets = new Map<string, Array<{ element: Element; node: ElementNode }>>();
    
    for (const item of elements) {
      const bucketKey = this.createBucketKey(item.element, item.node);
      
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      buckets.get(bucketKey)!.push(item);
    }
    
    return buckets;
  }

  /**
   * Create a bucket key for smart grouping based on basic properties
   */
  private createBucketKey(element: Element, node: ElementNode): string {
    const computed = window.getComputedStyle(element as HTMLElement);
    
    // Group by semantic type and approximate size
    const semanticType = this.getSemanticType(element);
    const widthBucket = Math.floor(node.layout.width / 50) * 50; // 50px buckets
    const heightBucket = Math.floor(node.layout.height / 25) * 25; // 25px buckets
    const hasBackground = computed.backgroundColor !== 'rgba(0, 0, 0, 0)';
    const hasText = element.textContent?.trim().length > 0;
    
    return `${semanticType}-${widthBucket}x${heightBucket}-${hasBackground ? 'bg' : 'nobg'}-${hasText ? 'text' : 'notext'}`;
  }

  /**
   * Find component groups within a bucket of similar elements
   */
  private findComponentGroupsInBucket(elements: Array<{ element: Element; node: ElementNode }>, bucketKey: string): ComponentGroup[] {
    const groups: ComponentGroup[] = [];
    const processed = new Set<Element>();
    
    for (let i = 0; i < elements.length; i++) {
      const candidate = elements[i];
      if (processed.has(candidate.element)) continue;
      
      // Find all similar elements to this candidate
      const similarElements = [candidate];
      processed.add(candidate.element);
      
      for (let j = i + 1; j < elements.length; j++) {
        const other = elements[j];
        if (processed.has(other.element)) continue;
        
        const similarity = this.calculateSimilarity(candidate.element, other.element, candidate.node, other.node);
        
        if (similarity.overallSimilarity >= this.SIMILARITY_THRESHOLD) {
          similarElements.push(other);
          processed.add(other.element);
        }
      }
      
      // Create component group if we have enough instances
      if (similarElements.length >= this.MIN_INSTANCES) {
        const group = this.createComponentGroup(similarElements, bucketKey);
        groups.push(group);
      }
    }
    
    return groups;
  }

  /**
   * Calculate visual similarity between two elements
   */
  public calculateSimilarity(element1: Element, element2: Element, node1: ElementNode, node2: ElementNode): ComponentSimilarity {
    const visual1 = this.createVisualFingerprint(element1, node1);
    const visual2 = this.createVisualFingerprint(element2, node2);
    
    const semantic1 = this.createSemanticFingerprint(element1, node1);
    const semantic2 = this.createSemanticFingerprint(element2, node2);
    
    // Calculate individual similarity scores
    const visualSimilarity = this.compareVisualFingerprints(visual1, visual2);
    const semanticSimilarity = this.compareSemanticFingerprints(semantic1, semantic2);
    const structuralSimilarity = this.compareStructural(node1, node2);
    
    // Calculate weighted overall similarity
    const overallSimilarity = 
      (visualSimilarity * this.WEIGHTS.visual) +
      (semanticSimilarity * this.WEIGHTS.semantic) +
      (structuralSimilarity * this.WEIGHTS.structural);
    
    return {
      element1,
      element2,
      node1,
      node2,
      visualSimilarity,
      semanticSimilarity,
      structuralSimilarity,
      overallSimilarity,
      scoreBreakdown: {
        layout: this.compareLayout(visual1, visual2),
        colors: this.compareColors(visual1, visual2),
        typography: this.compareTypography(visual1, visual2),
        styling: this.compareStyling(visual1, visual2),
        semantics: semanticSimilarity,
        structure: structuralSimilarity
      }
    };
  }

  /**
   * Create visual fingerprint from element
   */
  private createVisualFingerprint(element: Element, node: ElementNode): VisualFingerprint {
    const computed = window.getComputedStyle(element as HTMLElement);
    
    return {
      dimensions: {
        width: node.layout.width,
        height: node.layout.height
      },
      aspectRatio: node.layout.width / node.layout.height,
      hasFixedDimensions: computed.width !== 'auto' && computed.height !== 'auto',
      
      typography: this.extractTypography(computed),
      
      colors: {
        background: this.normalizeColor(computed.backgroundColor),
        text: this.normalizeColor(computed.color),
        border: this.normalizeColor(computed.borderColor),
        shadowColor: this.extractShadowColor(computed.boxShadow)
      },
      
      styling: {
        borderRadius: parseFloat(computed.borderRadius) || 0,
        borderWidth: parseFloat(computed.borderWidth) || 0,
        hasShadow: computed.boxShadow !== 'none',
        hasGradient: computed.backgroundImage.includes('gradient'),
        opacity: parseFloat(computed.opacity) || 1
      },
      
      layout: {
        display: computed.display,
        position: computed.position,
        flexDirection: computed.flexDirection,
        justifyContent: computed.justifyContent,
        alignItems: computed.alignItems,
        gap: parseFloat(computed.gap) || undefined
      }
    };
  }

  /**
   * Create semantic fingerprint from element
   */
  private createSemanticFingerprint(element: Element, node: ElementNode): SemanticFingerprint {
    const tagName = element.tagName.toLowerCase();
    
    return {
      tagName,
      elementType: this.getSemanticType(element),
      
      role: element.getAttribute('role'),
      ariaLabel: element.getAttribute('aria-label'),
      ariaRole: element.getAttribute('aria-role'),
      isInteractive: this.isInteractiveElement(element),
      
      hasText: (element.textContent?.trim().length || 0) > 0,
      hasImage: element.querySelector('img, svg') !== null,
      childCount: element.children.length,
      nestingLevel: this.calculateNestingLevel(element)
    };
  }

  /**
   * Compare visual fingerprints and return similarity score
   */
  private compareVisualFingerprints(fp1: VisualFingerprint, fp2: VisualFingerprint): number {
    const layoutScore = this.compareLayout(fp1, fp2);
    const colorsScore = this.compareColors(fp1, fp2);
    const typographyScore = this.compareTypography(fp1, fp2);
    const stylingScore = this.compareStyling(fp1, fp2);
    
    return (
      layoutScore * this.VISUAL_WEIGHTS.layout +
      colorsScore * this.VISUAL_WEIGHTS.colors +
      typographyScore * this.VISUAL_WEIGHTS.typography +
      stylingScore * this.VISUAL_WEIGHTS.styling
    );
  }

  /**
   * Compare layout properties
   */
  private compareLayout(fp1: VisualFingerprint, fp2: VisualFingerprint): number {
    let score = 0;
    let factors = 0;
    
    // Aspect ratio similarity
    const aspectRatioDiff = Math.abs(fp1.aspectRatio - fp2.aspectRatio);
    score += Math.max(0, 1 - aspectRatioDiff);
    factors++;
    
    // Size similarity (normalized)
    const sizeDiff = Math.abs(fp1.dimensions.width - fp2.dimensions.width) / Math.max(fp1.dimensions.width, fp2.dimensions.width);
    score += Math.max(0, 1 - sizeDiff * 2); // Allow 50% size difference
    factors++;
    
    // Display mode matching
    if (fp1.layout.display === fp2.layout.display) {
      score += 1;
    }
    factors++;
    
    // Flex properties (if applicable)
    if (fp1.layout.display === 'flex' && fp2.layout.display === 'flex') {
      if (fp1.layout.flexDirection === fp2.layout.flexDirection) score += 0.5;
      if (fp1.layout.justifyContent === fp2.layout.justifyContent) score += 0.5;
      factors++;
    }
    
    return factors > 0 ? score / factors : 0;
  }

  /**
   * Compare color properties
   */
  private compareColors(fp1: VisualFingerprint, fp2: VisualFingerprint): number {
    let score = 0;
    let factors = 0;
    
    // Background color
    if (this.colorsMatch(fp1.colors.background, fp2.colors.background)) {
      score += 1;
    }
    factors++;
    
    // Text color
    if (this.colorsMatch(fp1.colors.text, fp2.colors.text)) {
      score += 1;
    }
    factors++;
    
    // Border color
    if (this.colorsMatch(fp1.colors.border, fp2.colors.border)) {
      score += 1;
    }
    factors++;
    
    // Shadow color
    if (this.colorsMatch(fp1.colors.shadowColor, fp2.colors.shadowColor)) {
      score += 1;
    }
    factors++;
    
    return factors > 0 ? score / factors : 0;
  }

  /**
   * Compare typography properties
   */
  private compareTypography(fp1: VisualFingerprint, fp2: VisualFingerprint): number {
    if (!fp1.typography || !fp2.typography) {
      return fp1.typography === fp2.typography ? 1 : 0;
    }
    
    let score = 0;
    let factors = 0;
    
    // Font family
    if (fp1.typography.fontFamily === fp2.typography.fontFamily) {
      score += 1;
    }
    factors++;
    
    // Font size (allow 20% variance)
    const sizeDiff = Math.abs(fp1.typography.fontSize - fp2.typography.fontSize) / Math.max(fp1.typography.fontSize, fp2.typography.fontSize);
    score += Math.max(0, 1 - sizeDiff * 5);
    factors++;
    
    // Font weight
    if (fp1.typography.fontWeight === fp2.typography.fontWeight) {
      score += 1;
    }
    factors++;
    
    // Text alignment
    if (fp1.typography.textAlign === fp2.typography.textAlign) {
      score += 1;
    }
    factors++;
    
    return factors > 0 ? score / factors : 0;
  }

  /**
   * Compare styling properties
   */
  private compareStyling(fp1: VisualFingerprint, fp2: VisualFingerprint): number {
    let score = 0;
    let factors = 0;
    
    // Border radius (allow 20% variance)
    const radiusDiff = Math.abs(fp1.styling.borderRadius - fp2.styling.borderRadius);
    const maxRadius = Math.max(fp1.styling.borderRadius, fp2.styling.borderRadius);
    if (maxRadius === 0) {
      score += 1; // Both have no border radius
    } else {
      score += Math.max(0, 1 - (radiusDiff / maxRadius) * 5);
    }
    factors++;
    
    // Border width
    const borderDiff = Math.abs(fp1.styling.borderWidth - fp2.styling.borderWidth);
    score += borderDiff <= 1 ? 1 : 0; // Allow 1px difference
    factors++;
    
    // Shadow presence
    if (fp1.styling.hasShadow === fp2.styling.hasShadow) {
      score += 1;
    }
    factors++;
    
    // Gradient presence
    if (fp1.styling.hasGradient === fp2.styling.hasGradient) {
      score += 1;
    }
    factors++;
    
    return factors > 0 ? score / factors : 0;
  }

  /**
   * Compare semantic fingerprints
   */
  private compareSemanticFingerprints(fp1: SemanticFingerprint, fp2: SemanticFingerprint): number {
    let score = 0;
    let factors = 0;
    
    // Element type matching
    if (fp1.elementType === fp2.elementType) {
      score += 2; // High weight for semantic matching
    }
    factors += 2;
    
    // Tag name matching
    if (fp1.tagName === fp2.tagName) {
      score += 1;
    }
    factors++;
    
    // Interactive nature
    if (fp1.isInteractive === fp2.isInteractive) {
      score += 1;
    }
    factors++;
    
    // Content type
    if (fp1.hasText === fp2.hasText && fp1.hasImage === fp2.hasImage) {
      score += 1;
    }
    factors++;
    
    // Similar complexity (child count)
    const childCountDiff = Math.abs(fp1.childCount - fp2.childCount);
    score += childCountDiff <= 2 ? 1 : 0; // Allow 2 child difference
    factors++;
    
    return factors > 0 ? score / factors : 0;
  }

  /**
   * Compare structural properties (legacy compatibility)
   */
  private compareStructural(node1: ElementNode, node2: ElementNode): number {
    let score = 0;
    let factors = 0;
    
    // Type matching
    if (node1.type === node2.type) {
      score += 1;
    }
    factors++;
    
    // Child count similarity
    const childDiff = Math.abs((node1.children?.length || 0) - (node2.children?.length || 0));
    score += childDiff <= 2 ? 1 : 0;
    factors++;
    
    // Auto layout similarity
    if (node1.autoLayout && node2.autoLayout) {
      if (node1.autoLayout.layoutMode === node2.autoLayout.layoutMode) {
        score += 1;
      }
      factors++;
    }
    
    return factors > 0 ? score / factors : 0;
  }

  // Helper methods

  private extractTypography(computed: CSSStyleDeclaration) {
    const fontSize = parseFloat(computed.fontSize);
    if (isNaN(fontSize)) return null;
    
    return {
      fontFamily: computed.fontFamily.split(',')[0].replace(/['"]/g, '').trim(),
      fontSize,
      fontWeight: parseFloat(computed.fontWeight) || 400,
      lineHeight: parseFloat(computed.lineHeight) || fontSize * 1.2,
      textAlign: computed.textAlign
    };
  }

  private normalizeColor(color: string): string | null {
    if (!color || color === 'rgba(0, 0, 0, 0)' || color === 'transparent') {
      return null;
    }
    
    // Convert various color formats to a normalized format
    if (color.startsWith('rgb')) {
      return color;
    }
    
    // For hex colors, convert to rgb
    if (color.startsWith('#')) {
      const div = document.createElement('div');
      div.style.color = color;
      document.body.appendChild(div);
      const rgbColor = window.getComputedStyle(div).color;
      document.body.removeChild(div);
      return rgbColor;
    }
    
    return color;
  }

  private extractShadowColor(boxShadow: string): string | null {
    if (boxShadow === 'none') return null;
    
    // Extract color from box-shadow
    const colorMatch = boxShadow.match(/rgb\([^)]+\)|rgba\([^)]+\)|#[0-9a-fA-F]+/);
    return colorMatch ? colorMatch[0] : null;
  }

  private colorsMatch(color1: string | null, color2: string | null): boolean {
    return color1 === color2;
  }

  private getSemanticType(element: Element): string {
    const tagName = element.tagName.toLowerCase();
    const role = element.getAttribute('role');
    
    // Check explicit roles first
    if (role === 'button' || tagName === 'button') return 'button';
    if (role === 'link' || tagName === 'a') return 'link';
    if (tagName.includes('input') || tagName === 'textarea' || tagName === 'select') return 'input';
    if (tagName === 'img' || tagName === 'svg') return 'image';
    if (tagName === 'ul' || tagName === 'ol' || tagName === 'li') return 'list';
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span'].includes(tagName)) return 'text';
    if (['div', 'section', 'article', 'header', 'footer', 'nav'].includes(tagName)) return 'container';
    
    return 'other';
  }

  private isInteractiveElement(element: Element): boolean {
    const tagName = element.tagName.toLowerCase();
    const interactive = ['button', 'a', 'input', 'textarea', 'select'];
    
    if (interactive.includes(tagName)) return true;
    if (element.hasAttribute('onclick')) return true;
    if (element.getAttribute('role') === 'button') return true;
    if ((element as HTMLElement).style.cursor === 'pointer') return true;
    
    return false;
  }

  private calculateNestingLevel(element: Element): number {
    let level = 0;
    let parent = element.parentElement;
    
    while (parent) {
      level++;
      parent = parent.parentElement;
    }
    
    return level;
  }

  private createComponentGroup(elements: Array<{ element: Element; node: ElementNode }>, bucketKey: string): ComponentGroup {
    const baseElement = elements[0];
    const baseFingerprint = this.createVisualFingerprint(baseElement.element, baseElement.node);
    const semantic = this.createSemanticFingerprint(baseElement.element, baseElement.node);
    
    // Calculate average similarity within group
    let totalSimilarity = 0;
    let comparisons = 0;
    
    for (let i = 0; i < elements.length; i++) {
      for (let j = i + 1; j < elements.length; j++) {
        const similarity = this.calculateSimilarity(
          elements[i].element,
          elements[j].element,
          elements[i].node,
          elements[j].node
        );
        totalSimilarity += similarity.overallSimilarity;
        comparisons++;
      }
    }
    
    const avgSimilarity = comparisons > 0 ? totalSimilarity / comparisons : 1;
    
    return {
      id: `component-${bucketKey}-${Date.now()}`,
      name: `${semantic.elementType} component (${elements.length}x)`,
      pattern: `${semantic.tagName}.${semantic.elementType}`,
      similarity: avgSimilarity,
      instances: elements.map((item, index) => ({
        element: item.element,
        node: item.node,
        confidence: avgSimilarity
      })),
      baseFingerprint,
      semanticType: semantic.elementType
    };
  }

  private convertToLegacyFormat(componentGroups: Map<string, ComponentGroup>): { definitions: Record<string, any> } {
    const definitions: Record<string, any> = {};
    let counter = 0;
    
    for (const group of componentGroups.values()) {
      const componentId = `component-${counter++}`;
      
      const masterInstance = group.instances[0];
      const tagName = masterInstance.element.tagName.toLowerCase();
      const classes = Array.from(masterInstance.element.classList || []).join('.');
      const selector = classes ? `${tagName}.${classes}` : tagName;

      definitions[componentId] = {
        id: componentId,
        name: group.name,
        description: `Visually similar ${group.semanticType} elements (${(group.similarity * 100).toFixed(1)}% similarity)`,
        masterElementId: masterInstance.node.id,
        domSelector: selector,
        signature: group.pattern,
        instanceCount: group.instances.length,
        averageSimilarity: group.similarity,
        semanticType: group.semanticType,
        properties: {
          tag: tagName,
          classes: Array.from(masterInstance.element.classList || []),
          visualFingerprint: group.baseFingerprint
        }
      };
      
      // Mark all instances with component ID
      group.instances.forEach((instance, index) => {
        instance.node.componentId = componentId;
        instance.node.isComponent = index === 0;
        instance.node.componentSimilarity = instance.confidence;
      });
    }
    
    return { definitions };
  }

  private collectAllElements(tree: ElementNode): Array<{ element: Element; node: ElementNode }> {
    const elements: Array<{ element: Element; node: ElementNode }> = [];
    const visited = new WeakSet<ElementNode>();
    
    const traverse = (node: ElementNode) => {
      if (visited.has(node)) return;
      visited.add(node);
      
      // Try to find the corresponding DOM element
      const element = this.findDOMElement(node);
      if (element) {
        elements.push({ element, node });
      }
      
      if (Array.isArray(node.children)) {
        node.children.forEach(child => {
          if (child && typeof child === 'object') {
            traverse(child);
          }
        });
      }
    };
    
    traverse(tree);
    return elements;
  }

  private findDOMElement(node: ElementNode): Element | null {
    // Try multiple strategies to find the DOM element
    
    // Method 1: By ID
    if (node.id && typeof node.id === 'string') {
      const element = document.getElementById(node.id);
      if (element) return element;
    }
    
    // Method 2: By CSS ID if available in metadata
    const cssId = (node as any).cssId;
    if (cssId) {
      const element = document.getElementById(cssId);
      if (element) return element;
    }
    
    // Method 3: By data attributes
    const dataAttributes = (node as any).dataAttributes;
    if (dataAttributes) {
      const selectors = Object.entries(dataAttributes)
        .map(([key, value]) => `[data-${key}="${value}"]`)
        .slice(0, 3); // Limit to avoid complex selectors
      
      for (const selector of selectors) {
        try {
          const element = document.querySelector(selector);
          if (element) return element;
        } catch (e) {
          // Invalid selector, continue
        }
      }
    }
    
    // Method 4: By tag + classes (less reliable but fallback)
    const htmlTag = (node as any).htmlTag;
    const cssClasses = (node as any).cssClasses;
    if (htmlTag && Array.isArray(cssClasses) && cssClasses.length > 0) {
      try {
        const classSelector = cssClasses.slice(0, 2).join('.'); // Limit to first 2 classes
        const selector = `${htmlTag}.${classSelector}`;
        const candidates = document.querySelectorAll(selector);
        
        // If unique match, return it
        if (candidates.length === 1) {
          return candidates[0];
        }
      } catch (e) {
        // Invalid selector
      }
    }
    
    return null;
  }

  private logComponentSummary(componentGroups: Map<string, ComponentGroup>): void {
    console.log('\n🎯 Component Detection Summary:');
    console.log('━'.repeat(50));
    
    const sortedGroups = Array.from(componentGroups.values()).sort((a, b) => b.instances.length - a.instances.length);
    
    for (const group of sortedGroups) {
      console.log(`📦 ${group.name}`);
      console.log(`   Similarity: ${(group.similarity * 100).toFixed(1)}%`);
      console.log(`   Instances: ${group.instances.length}`);
      console.log(`   Type: ${group.semanticType}`);
      console.log('');
    }
  }
}