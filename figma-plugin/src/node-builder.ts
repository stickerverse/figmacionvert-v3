import { StyleManager } from './style-manager';
import { ComponentManager } from './component-manager';
import { ImportOptions } from './importer';

type SceneNodeWithGeometry = SceneNode & GeometryMixin;

export class NodeBuilder {
  private imageFetchCache = new Map<string, Uint8Array>();
  private imagePaintCache = new Map<string, string>();
  private assets: any;
  private fontCache = new Map<string, { family: string; style: string }>();

  constructor(
    private styleManager: StyleManager,
    private componentManager: ComponentManager,
    private options: ImportOptions,
    assets?: any
  ) {
    this.assets = assets;
  }

  setAssets(assets: any): void {
    this.assets = assets;
  }

  private async loadFontWithFallbacks(requestedFamily: string, requestedStyle: string): Promise<{ family: string; style: string }> {
    const cacheKey = `${requestedFamily}:${requestedStyle}`;
    if (this.fontCache.has(cacheKey)) {
      return this.fontCache.get(cacheKey)!;
    }

    // Clean and normalize font family name
    const cleanFamily = requestedFamily.replace(/['"]/g, '').trim();
    
    // Define font fallback chains for common web fonts
    const fontFallbacks = new Map([
      // Serif fonts
      ['Times', ['Times New Roman', 'Times', 'serif']],
      ['Times New Roman', ['Times New Roman', 'Times', 'serif']],
      ['Georgia', ['Georgia', 'Times New Roman', 'serif']],
      
      // Sans-serif fonts  
      ['Arial', ['Arial', 'Helvetica', 'sans-serif']],
      ['Helvetica', ['Helvetica', 'Arial', 'sans-serif']],
      ['Helvetica Neue', ['Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif']],
      ['Roboto', ['Roboto', 'Arial', 'sans-serif']],
      ['Open Sans', ['Open Sans', 'Arial', 'sans-serif']],
      ['Lato', ['Lato', 'Arial', 'sans-serif']],
      ['Montserrat', ['Montserrat', 'Arial', 'sans-serif']],
      ['Source Sans Pro', ['Source Sans Pro', 'Arial', 'sans-serif']],
      
      // Monospace fonts
      ['Monaco', ['Monaco', 'Menlo', 'monospace']],
      ['Menlo', ['Menlo', 'Monaco', 'monospace']],
      ['Courier', ['Courier', 'Courier New', 'monospace']],
      ['Courier New', ['Courier New', 'Courier', 'monospace']],
      ['SF Mono', ['SF Mono', 'Monaco', 'Menlo', 'monospace']],
      
      // System fonts
      ['-apple-system', ['Inter', 'Arial', 'sans-serif']],
      ['system-ui', ['Inter', 'Arial', 'sans-serif']],
      ['BlinkMacSystemFont', ['Inter', 'Arial', 'sans-serif']],
    ]);

    // Get fallback chain for the requested font
    const fallbackChain = fontFallbacks.get(cleanFamily) || [cleanFamily, 'Arial', 'Inter'];
    
    // Try each font in the fallback chain
    for (const fontFamily of fallbackChain) {
      // Try different style variations for each font
      const stylesToTry = [
        requestedStyle,
        'Regular',
        'Normal',
        'Medium',
        'Bold',
        'Light'
      ].filter((style, index, arr) => arr.indexOf(style) === index); // Remove duplicates

      for (const style of stylesToTry) {
        try {
          await figma.loadFontAsync({ family: fontFamily, style });
          const result = { family: fontFamily, style };
          this.fontCache.set(cacheKey, result);
          console.log(`✅ Loaded font: ${fontFamily} ${style} (requested: ${cleanFamily} ${requestedStyle})`);
          return result;
        } catch (error) {
          // Continue to next fallback
          console.log(`⚠️ Failed to load: ${fontFamily} ${style}`);
        }
      }
    }

    // Last resort fallback to Inter Regular
    try {
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
      const result = { family: 'Inter', style: 'Regular' };
      this.fontCache.set(cacheKey, result);
      console.warn(`❌ Using last resort font Inter Regular for: ${cleanFamily} ${requestedStyle}`);
      return result;
    } catch (error) {
      throw new Error(`Critical error: Cannot load any font including Inter Regular`);
    }
  }

  async createNode(nodeData: any): Promise<SceneNode | null> {
    if (!nodeData) return null;

    if (nodeData.componentSignature) {
      const registered = this.componentManager.getComponentBySignature(nodeData.componentSignature);
      if (registered && nodeData.type !== 'COMPONENT') {
        const instance = registered.createInstance();
        await this.afterCreate(instance, nodeData, { reuseComponent: true });
        return instance;
      }
    }

    let node: SceneNode | null = null;

    switch (nodeData.type) {
      case 'TEXT':
        node = await this.createText(nodeData);
        break;
      case 'IMAGE':
        node = await this.createImage(nodeData);
        break;
      case 'VECTOR':
        node = await this.createVector(nodeData);
        break;
      case 'RECTANGLE':
        node = await this.createRectangle(nodeData);
        break;
      case 'COMPONENT':
        node = await this.createComponent(nodeData);
        break;
      case 'INSTANCE':
        node = await this.createInstance(nodeData);
        break;
      case 'FRAME':
      default:
        node = await this.createFrame(nodeData);
        break;
    }

    if (!node) {
      return null;
    }

    await this.afterCreate(node, nodeData, { reuseComponent: false });

    if (nodeData.type === 'COMPONENT') {
      const component = node as ComponentNode;
      const componentId = nodeData.componentId || nodeData.id || component.id;
      this.componentManager.registerComponent(componentId, component);
      if (nodeData.componentSignature) {
        this.componentManager.registerSignature(nodeData.componentSignature, component);
      }
    } else if (nodeData.componentSignature) {
      this.safeSetPluginData(node, 'componentSignature', nodeData.componentSignature);
    }

    return node;
  }

  private async createFrame(data: any): Promise<FrameNode> {
    const frame = figma.createFrame();
    frame.name = data.name || 'Frame';
    frame.resize(Math.max(data.layout.width || 1, 1), Math.max(data.layout.height || 1, 1));
    return frame;
  }

  private async createRectangle(data: any): Promise<RectangleNode> {
    const rect = figma.createRectangle();
    rect.name = data.name || 'Rectangle';
    rect.resize(Math.max(data.layout.width || 1, 1), Math.max(data.layout.height || 1, 1));
    rect.strokes = [];
    rect.effects = [];
    return rect;
  }

  private async createText(data: any): Promise<TextNode> {
    const text = figma.createText();
    text.name = data.name || 'Text';

    if (data.textStyle) {
      const fontStyle = this.mapFontWeight(data.textStyle.fontWeight);
      let fontFamily = data.textStyle.fontFamily;
      let finalFontStyle = fontStyle;

      // Progressive font fallback strategy for better fidelity
      const originalFontFamily = fontFamily;
      const fontLoadResult = await this.loadFontWithFallbacks(fontFamily, fontStyle);
      fontFamily = fontLoadResult.family;
      finalFontStyle = fontLoadResult.style;

      // Critical fix: Compensate for font metric differences if font fallback occurred
      let fontMetricsRatio = 1.0;
      if (fontFamily !== originalFontFamily) {
        fontMetricsRatio = this.getFontMetricsRatio(fontFamily, originalFontFamily);
        console.log(`📝 Font fallback: ${originalFontFamily} → ${fontFamily} (ratio: ${fontMetricsRatio.toFixed(3)})`);
      }

      text.fontName = { family: fontFamily, style: finalFontStyle };
      
      // Apply font metrics compensation if font fallback occurred
      const adjustedFontSize = data.textStyle.fontSize * fontMetricsRatio;
      text.fontSize = adjustedFontSize;
      text.textAlignHorizontal = data.textStyle.textAlignHorizontal;
      text.textAlignVertical = data.textStyle.textAlignVertical;

      if (data.textStyle.lineHeight?.unit === 'PIXELS') {
        text.lineHeight = { unit: 'PIXELS', value: data.textStyle.lineHeight.value };
      } else if (data.textStyle.lineHeight?.unit === 'PERCENT') {
        text.lineHeight = { unit: 'PERCENT', value: data.textStyle.lineHeight.value };
      } else {
        text.lineHeight = { unit: 'AUTO' };
      }

      if (data.textStyle.letterSpacing?.unit === 'PIXELS') {
        text.letterSpacing = { unit: 'PIXELS', value: data.textStyle.letterSpacing.value };
      } else {
        text.letterSpacing = {
          unit: data.textStyle.letterSpacing?.unit || 'PIXELS',
          value: data.textStyle.letterSpacing?.value || 0
        };
      }

      if (data.textStyle?.fills?.length) {
        text.fills = await this.convertFillsAsync(data.textStyle.fills);
      }

      // Apply text decoration (underline, strikethrough)
      if (data.textStyle.textDecoration) {
        text.textDecoration = data.textStyle.textDecoration;
      }

      // Apply text case (uppercase, lowercase, capitalize, title)
      if (data.textStyle.textCase) {
        text.textCase = data.textStyle.textCase;
      }

      if (data.textStyle.fontStyle) {
        this.safeSetPluginData(text, 'fontStyle', data.textStyle.fontStyle);
      }
      if (data.textStyle.paragraphSpacing !== undefined) {
        this.safeSetPluginData(text, 'paragraphSpacing', String(data.textStyle.paragraphSpacing));
      }
      if (data.textStyle.paragraphIndent !== undefined) {
        this.safeSetPluginData(text, 'paragraphIndent', String(data.textStyle.paragraphIndent));
      }
      if (data.textStyle.whiteSpace) {
        this.safeSetPluginData(text, 'whiteSpace', data.textStyle.whiteSpace);
        // Apply text auto resize based on white-space
        if (data.textStyle.whiteSpace === 'nowrap') {
          text.textAutoResize = 'WIDTH_AND_HEIGHT';
        } else if (data.textStyle.whiteSpace === 'pre' || data.textStyle.whiteSpace === 'pre-wrap') {
          text.textAutoResize = 'HEIGHT';
        }
      }
      if (data.textStyle.wordWrap) {
        this.safeSetPluginData(text, 'wordWrap', data.textStyle.wordWrap);
      }
      if (data.textStyle.textOverflow) {
        this.safeSetPluginData(text, 'textOverflow', data.textStyle.textOverflow);
        // Handle text-overflow: ellipsis
        if (data.textStyle.textOverflow === 'ellipsis') {
          text.textTruncation = 'ENDING';
        }
      }
      if (data.textStyle.listStyleType) {
        this.safeSetPluginData(text, 'listStyleType', data.textStyle.listStyleType);
      }

      // Apply text shadows as effects
      if (data.textStyle.textShadows?.length) {
        const existingEffects = text.effects || [];
        const textShadowEffects = this.convertEffects(data.textStyle.textShadows);
        text.effects = [...existingEffects, ...textShadowEffects];
      }
    }

    text.characters = data.characters || '';
    return text;
  }

  private async createImage(data: any): Promise<RectangleNode> {
    const rect = figma.createRectangle();
    rect.name = data.name || 'Image';
    rect.resize(Math.max(data.layout.width || 1, 1), Math.max(data.layout.height || 1, 1));
    return rect;
  }

  private async createVector(data: any): Promise<SceneNode | null> {
    if (data.vectorData?.svgCode) {
      try {
        const vectorRoot = figma.createNodeFromSvg(data.vectorData.svgCode);
        vectorRoot.name = data.name || 'Vector';
        return vectorRoot as SceneNode;
      } catch (error) {
        console.warn('Failed to create vector from SVG, falling back to rectangle.', error);
      }
    }

    return this.createRectangle(data);
  }

  private async createComponent(data: any): Promise<ComponentNode> {
    const component = figma.createComponent();
    component.name = data.name || 'Component';
    component.resize(Math.max(data.layout.width || 1, 1), Math.max(data.layout.height || 1, 1));
    return component;
  }

  private async createInstance(data: any): Promise<SceneNode | null> {
    const componentId = data.componentId || data.componentKey || data.id;
    if (componentId) {
      const existing = this.componentManager.getComponent(componentId);
      if (existing) {
        return existing.createInstance();
      }
    }

    const signature = data.componentSignature;
    if (signature) {
      const registered = this.componentManager.getComponentBySignature(signature);
      if (registered) {
        return registered.createInstance();
      }
    }

    return this.createFrame(data);
  }

  private async afterCreate(node: SceneNode, data: any, meta: { reuseComponent: boolean }): Promise<void> {
    node.name = data.name || node.name;

    this.applyPositioning(node, data);
    await this.applyCommonStyles(node, data);
    this.applyAutoLayout(node, data);
    this.applyGridLayoutMetadata(node, data);
    this.applyOverflow(node, data);
    this.applyVisibility(node, data);
    this.applyFilters(node, data);
    this.applyMetadata(node, data, meta);
  }

  private applyPositioning(node: SceneNode, data: any) {
    if (data.layout) {
      // Adjust dimensions based on box-sizing and stroke compensation
      let width = data.layout.width || 1;
      let height = data.layout.height || 1;
      
      // Critical fix: Compensate for Figma stroke expansion
      if (data.strokes?.length && data.strokeWeight) {
        const strokeWeight = data.strokeWeight || 0;
        
        if (data.layout.boxSizing === 'border-box') {
          // Border-box: CSS dimensions include borders, but Figma strokes expand beyond
          // Reduce content area to compensate for Figma's stroke expansion
          width = Math.max(width - strokeWeight, 1);
          height = Math.max(height - strokeWeight, 1);
          
          this.safeSetPluginData(node, 'borderBoxCompensation', strokeWeight.toString());
        } else {
          // Content-box: No adjustment needed as strokes are additional
          this.safeSetPluginData(node, 'contentBoxStroke', strokeWeight.toString());
        }
      }
      
      node.x = data.layout.x || 0;
      node.y = data.layout.y || 0;
      
      // Handle absolute positioning with better precision
      if (data.position === 'absolute' || data.position === 'fixed') {
        if (data.positionValues) {
          // Use absolute layout positioning if available for better accuracy
          if (data.absoluteLayout) {
            node.x = data.absoluteLayout.left || node.x;
            node.y = data.absoluteLayout.top || node.y;
            width = data.absoluteLayout.width || width;
            height = data.absoluteLayout.height || height;
          }
          
          // Store CSS position values for reference
          this.safeSetPluginData(node, 'cssPositionValues', JSON.stringify(data.positionValues));
        }
      }
      
      if ('rotation' in node) {
        (node as any).rotation = data.layout.rotation || 0;
      }
      
      if (typeof width === 'number' && typeof height === 'number') {
        if ('resize' in node) {
          (node as LayoutMixin).resize(Math.max(width, 1), Math.max(height, 1));
        }
      }
    }

    // Note: layoutPositioning is not set here because:
    // - If parent has Auto Layout (layoutMode !== NONE), children must use AUTO positioning
    // - If parent has manual layout (layoutMode === NONE), children use x/y positions (already set above)
    // - Setting ABSOLUTE on a node before it has a parent, then adding it to an Auto Layout parent, causes errors

    // Store CSS position type for reference (absolute, fixed, relative, sticky)
    if (data.position) {
      this.safeSetPluginData(node, 'cssPosition', data.position);

      if ('layoutPositioning' in node) {
        if (data.position === 'absolute' || data.position === 'fixed' || data.position === 'sticky') {
          try {
            (node as FrameNode).layoutPositioning = 'ABSOLUTE';
          } catch {
            // ignore nodes that don't support it
          }
        }
      }
    }

    // layoutGrow and layoutAlign can only be set on children of Auto Layout containers
    if ('layoutGrow' in node && typeof data.autoLayout?.layoutGrow === 'number') {
      try {
        (node as any).layoutGrow = data.autoLayout.layoutGrow;
      } catch (error) {
        console.warn(`Cannot set layoutGrow on node "${node.name}":`, error);
        this.safeSetPluginData(node, 'cssLayoutGrow', data.autoLayout.layoutGrow.toString());
      }
    }
    if ('layoutAlign' in node && data.autoLayout?.layoutAlign) {
      try {
        (node as any).layoutAlign = data.autoLayout.layoutAlign;
      } catch (error) {
        console.warn(`Cannot set layoutAlign on node "${node.name}":`, error);
        this.safeSetPluginData(node, 'cssLayoutAlign', data.autoLayout.layoutAlign);
      }
    }

    // DISABLED: Applying relativeTransform causes "rotation is not invertible" errors
    // and conflicts with Figma's layout system. Use simple x/y positioning instead.
    // Complex CSS transforms (scale, skew, 3D) are stored in plugin data for reference.
    if (data.transform?.matrix) {
      this.safeSetPluginData(node, 'cssTransform', JSON.stringify(data.transform));
    }

    // Apply responsive constraints if available
    if (data.layout) {
      this.applyResponsiveConstraints(node, data.layout);
    }
  }

  /**
   * Apply responsive constraints (min/max width/height) to Figma nodes
   * Note: minWidth/maxWidth can only be set on Auto Layout nodes and their children
   */
  private applyResponsiveConstraints(node: SceneNode, layout: any) {
    // Figma supports minWidth, maxWidth, minHeight, maxHeight on frames
    if (!('minWidth' in node)) return;

    const frameNode = node as FrameNode;

    // Check if this node supports min/max constraints
    // These can only be set on Auto Layout nodes (layoutMode !== 'NONE') or their children
    const supportsMinMaxConstraints = this.nodeSupportsMinMaxConstraints(frameNode);

    // Always store the CSS values in plugin data for reference
    if (typeof layout.minWidth === 'number' && layout.minWidth > 0) {
      this.safeSetPluginData(node, 'cssMinWidth', layout.minWidth.toString());
      
      if (supportsMinMaxConstraints) {
        try {
          frameNode.minWidth = layout.minWidth;
        } catch (error) {
          console.warn(`Cannot set minWidth on node "${frameNode.name}":`, error);
        }
      }
    }

    if (typeof layout.maxWidth === 'number' && layout.maxWidth > 0) {
      this.safeSetPluginData(node, 'cssMaxWidth', layout.maxWidth.toString());
      
      if (supportsMinMaxConstraints) {
        try {
          frameNode.maxWidth = layout.maxWidth;
        } catch (error) {
          console.warn(`Cannot set maxWidth on node "${frameNode.name}":`, error);
        }
      }
    }

    // Apply min/max height (these have fewer restrictions)
    if (typeof layout.minHeight === 'number' && layout.minHeight > 0) {
      this.safeSetPluginData(node, 'cssMinHeight', layout.minHeight.toString());
      
      try {
        frameNode.minHeight = layout.minHeight;
      } catch (error) {
        console.warn(`Cannot set minHeight on node "${frameNode.name}":`, error);
      }
    }

    if (typeof layout.maxHeight === 'number' && layout.maxHeight > 0) {
      this.safeSetPluginData(node, 'cssMaxHeight', layout.maxHeight.toString());
      
      try {
        frameNode.maxHeight = layout.maxHeight;
      } catch (error) {
        console.warn(`Cannot set maxHeight on node "${frameNode.name}":`, error);
      }
    }
  }

  /**
   * Check if a node supports min/max width constraints
   * Returns true if the node is an Auto Layout container or child of one
   */
  private nodeSupportsMinMaxConstraints(node: FrameNode): boolean {
    // If this node itself has Auto Layout, it supports constraints
    if ('layoutMode' in node && node.layoutMode !== 'NONE') {
      return true;
    }

    // If this node's parent has Auto Layout, this node (as a child) supports constraints
    if (node.parent && 'layoutMode' in node.parent) {
      const parentFrame = node.parent as FrameNode;
      return parentFrame.layoutMode !== 'NONE';
    }

    return false;
  }

  private async applyCommonStyles(node: SceneNode, data: any): Promise<void> {
    // Process backgrounds if available (preferred for proper positioning/sizing)
    if (data.backgrounds?.length && 'fills' in node && node.type !== 'TEXT') {
      (node as SceneNodeWithGeometry).fills = await this.convertBackgroundLayersAsync(
        data.backgrounds,
        data.layout
      );
    } else if (data.fills && 'fills' in node && node.type !== 'TEXT') {
      // Fallback to basic fills if no backgrounds
      (node as SceneNodeWithGeometry).fills = await this.convertFillsAsync(data.fills);
    }

    if (data.strokes && 'strokes' in node) {
      (node as SceneNodeWithGeometry).strokes = await this.convertStrokesAsync(data.strokes);
    }

    if ('strokeWeight' in node && data.strokeWeight !== undefined) {
      (node as any).strokeWeight = data.strokeWeight;
    } else if ('strokeWeight' in node && data.strokes?.[0]?.thickness) {
      (node as any).strokeWeight = data.strokes[0].thickness;
    }

    if ('strokeAlign' in node && data.strokeAlign) {
      (node as any).strokeAlign = data.strokeAlign;
    }

    // Apply dashed/dotted border styles
    if ('dashPattern' in node && data.borderStyle) {
      const dashPatterns: Record<string, number[]> = {
        dashed: [10, 5],
        dotted: [2, 3],
        solid: []
      };
      const pattern = dashPatterns[data.borderStyle] || [];
      if (pattern.length > 0) {
        (node as any).dashPattern = pattern;
      }
      // Store original border style in plugin data
      this.safeSetPluginData(node, 'borderStyle', data.borderStyle);
    }

    if (data.cornerRadius && 'cornerRadius' in node) {
      this.applyCornerRadius(node as any, data.cornerRadius);
    }

    const existingEffects = 'effects' in node ? [...((node as BlendMixin).effects || [])] : [];
    if (data.effects?.length && 'effects' in node) {
      existingEffects.push(...this.convertEffects(data.effects));
    }

    if (existingEffects.length && 'effects' in node) {
      (node as BlendMixin).effects = existingEffects;
    }

    if (data.opacity !== undefined && 'opacity' in node) {
      (node as any).opacity = data.opacity;
    }

    if (data.blendMode && 'blendMode' in node) {
      (node as any).blendMode = data.blendMode;
    }
    if (data.mixBlendMode && 'blendMode' in node) {
      (node as any).blendMode = data.mixBlendMode;
    }
  }

  private applyCornerRadius(node: any, radius: any) {
    if (typeof radius === 'number') {
      node.cornerRadius = radius;
    } else {
      node.topLeftRadius = radius.topLeft || 0;
      node.topRightRadius = radius.topRight || 0;
      node.bottomRightRadius = radius.bottomRight || 0;
      node.bottomLeftRadius = radius.bottomLeft || 0;
    }
  }

  private applyAutoLayout(node: SceneNode, data: any) {
    // Auto Layout is applied later via layout-upgrader to preserve fidelity
    return;
  }

  /**
   * Store CSS Grid layout metadata in plugin data for reference
   * Note: Figma's Auto Layout cannot represent true 2D grids, so we store the original
   * grid properties for documentation/debugging purposes
   */
  private applyGridLayoutMetadata(node: SceneNode, data: any) {
    if (!data.gridLayout) return;

    const grid = data.gridLayout;

    // Store grid layout information in plugin data
    this.safeSetPluginData(node, 'gridLayout', JSON.stringify({
      templateColumns: grid.templateColumns,
      templateRows: grid.templateRows,
      columnGap: grid.columnGap,
      rowGap: grid.rowGap,
      autoFlow: grid.autoFlow,
      justifyItems: grid.justifyItems,
      alignItems: grid.alignItems,
      justifyContent: grid.justifyContent,
      alignContent: grid.alignContent
    }));

    // Store grid child properties if present
    if (data.gridChild) {
      this.safeSetPluginData(node, 'gridChild', JSON.stringify(data.gridChild));
    }

    // Add visual indicator that this was a grid layout
    if ('name' in node && typeof node.name === 'string') {
      if (!node.name.includes('[Grid]')) {
        node.name = `${node.name} [Grid]`;
      }
    }
  }

  private applyOverflow(node: SceneNode, data: any) {
    if (!data.overflow) return;
    if ('clipsContent' in node) {
      const horizontalHidden = data.overflow.horizontal === 'hidden' || data.overflow.horizontal === 'clip';
      const verticalHidden = data.overflow.vertical === 'hidden' || data.overflow.vertical === 'clip';
      (node as FrameNode).clipsContent = horizontalHidden || verticalHidden;
    }
  }

  private applyVisibility(node: SceneNode, data: any) {
    if (data.display === 'none' || data.visibility === 'hidden' || data.visibility === 'collapse') {
      node.visible = false;
    } else {
      node.visible = true;
    }
  }

  private applyFilters(node: SceneNode, data: any) {
    if (!('setPluginData' in node)) return;
    const existingEffects = 'effects' in node ? [...((node as BlendMixin).effects || [])] : [];

    (data.filters || []).forEach((filter: any) => {
      if (filter.type === 'blur' && 'effects' in node) {
        existingEffects.push({
          type: 'LAYER_BLUR',
          radius: filter.unit === 'px' ? filter.value : filter.value || 0,
          visible: true
        } as BlurEffect);
      }
      if (filter.type === 'dropShadow' && 'effects' in node) {
        existingEffects.push({
          type: 'DROP_SHADOW',
          color: filter.color || { r: 0, g: 0, b: 0, a: 0.5 },
          offset: filter.offset || { x: 0, y: 0 },
          radius: filter.unit === 'px' ? filter.value : filter.value || 0,
          spread: 0,
          visible: true,
          blendMode: 'NORMAL'
        } as DropShadowEffect);
      }
    });

    if (existingEffects.length && 'effects' in node) {
      (node as BlendMixin).effects = existingEffects;
    }

    if (data.filters?.length) {
      this.safeSetPluginData(node, 'cssFilters', JSON.stringify(data.filters));
    }
    if (data.backdropFilters?.length) {
      this.safeSetPluginData(node, 'cssBackdropFilters', JSON.stringify(data.backdropFilters));
    }
  }

  private applyMetadata(node: SceneNode, data: any, meta: { reuseComponent: boolean }) {
    this.applyConstraints(node, data);

    // layoutGrow and layoutAlign can only be set on children of Auto Layout containers
    if ('layoutGrow' in node && data.autoLayout?.layoutGrow !== undefined) {
      try {
        (node as any).layoutGrow = data.autoLayout.layoutGrow;
      } catch (error) {
        console.warn(`Cannot set layoutGrow on node "${node.name}" in metadata:`, error);
        this.safeSetPluginData(node, 'cssLayoutGrow', data.autoLayout.layoutGrow.toString());
      }
    }
    if ('layoutAlign' in node && data.autoLayout?.layoutAlign) {
      try {
        (node as any).layoutAlign = data.autoLayout.layoutAlign;
      } catch (error) {
        console.warn(`Cannot set layoutAlign on node "${node.name}" in metadata:`, error);
        this.safeSetPluginData(node, 'cssLayoutAlign', data.autoLayout.layoutAlign);
      }
    }

    this.safeSetPluginData(node, 'sourceNodeId', data.id || '');
    this.safeSetPluginData(node, 'htmlTag', data.htmlTag || '');

    if (data.cssClasses?.length) {
      this.safeSetPluginData(node, 'cssClasses', JSON.stringify(data.cssClasses));
    }

    if (data.dataAttributes && Object.keys(data.dataAttributes).length) {
      this.safeSetPluginData(node, 'dataAttributes', JSON.stringify(data.dataAttributes));
    }

    if (data.cssCustomProperties) {
      this.safeSetPluginData(node, 'cssCustomProperties', JSON.stringify(data.cssCustomProperties));
    }

    if (data.clipPath) {
      this.safeSetPluginData(node, 'cssClipPath', JSON.stringify(data.clipPath));
    }

    if (data.mask) {
      this.safeSetPluginData(node, 'cssMask', JSON.stringify(data.mask));
    }

    if (data.pointerEvents) {
      this.safeSetPluginData(node, 'pointerEvents', data.pointerEvents);
    }

    if (data.position) {
      this.safeSetPluginData(node, 'positioning', data.position);
    }

    if (data.absoluteLayout) {
      this.safeSetPluginData(node, 'absoluteLayout', JSON.stringify(data.absoluteLayout));
    }

    if (data.scrollData) {
      this.safeSetPluginData(node, 'scrollData', JSON.stringify(data.scrollData));
    }

    if (data.contentHash) {
      this.safeSetPluginData(node, 'contentHash', data.contentHash);
    }

    if (meta.reuseComponent) {
      this.safeSetPluginData(node, 'componentInstance', 'true');
    }
  }

  private applyConstraints(node: SceneNode, data: any) {
    if (!data.constraints) return;
    if ('constraints' in node) {
      (node as ConstraintMixin).constraints = {
        horizontal: data.constraints.horizontal || 'MIN',
        vertical: data.constraints.vertical || 'MIN'
      };
    }
  }

  /**
   * Convert background layers with proper positioning, sizing, and repeat handling
   */
  private async convertBackgroundLayersAsync(
    backgrounds: any[],
    nodeLayout?: { width: number; height: number }
  ): Promise<Paint[]> {
    const paints: Paint[] = [];

    for (const layer of backgrounds) {
      if (!layer || !layer.fill) continue;

      const fill = layer.fill;

      // Handle solid colors and gradients
      if (fill.type === 'SOLID' && fill.color) {
        const { r, g, b } = fill.color;
        paints.push({
          type: 'SOLID',
          color: { r, g, b },
          opacity: fill.opacity !== undefined ? fill.opacity : fill.color.a ?? 1,
          visible: fill.visible !== false
        } as SolidPaint);
        continue;
      }

      if ((fill.type === 'GRADIENT_LINEAR' || fill.type === 'GRADIENT_RADIAL') && fill.gradientStops) {
        paints.push({
          type: fill.type,
          gradientStops: fill.gradientStops.map((stop: any) => {
            const { r, g, b, a } = stop.color;
            return {
              position: stop.position,
              color: { r, g, b, a }
            };
          }),
          gradientTransform: fill.gradientTransform || [
            [1, 0, 0],
            [0, 1, 0]
          ],
          visible: fill.visible !== false
        } as GradientPaint);
        continue;
      }

      // Handle images with advanced positioning/sizing
      if (fill.type === 'IMAGE') {
        paints.push(
          await this.resolveImagePaintWithBackground(fill, layer, nodeLayout)
        );
        continue;
      }
    }

    return paints;
  }

  private async convertFillsAsync(fills: any[]): Promise<Paint[]> {
    const paints: Paint[] = [];

    for (const fill of fills) {
      if (!fill) continue;

      if (fill.type === 'SOLID' && fill.color) {
        const { r, g, b } = fill.color;
        paints.push({
          type: 'SOLID',
          color: { r, g, b },
          opacity: fill.opacity !== undefined ? fill.opacity : fill.color.a ?? 1,
          visible: fill.visible !== false
        } as SolidPaint);
        continue;
      }

      if ((fill.type === 'GRADIENT_LINEAR' || fill.type === 'GRADIENT_RADIAL') && fill.gradientStops) {
        paints.push({
          type: fill.type,
          gradientStops: fill.gradientStops.map((stop: any) => {
            const { r, g, b, a } = stop.color;
            return {
              position: stop.position,
              color: { r, g, b, a }
            };
          }),
          gradientTransform: fill.gradientTransform || [
            [1, 0, 0],
            [0, 1, 0]
          ],
          visible: fill.visible !== false
        } as GradientPaint);
        continue;
      }

      if (fill.type === 'IMAGE') {
        paints.push(await this.resolveImagePaint(fill));
        continue;
      }
    }

    return paints;
  }

  /**
   * Resolve image paint with background layer properties (position, size, repeat)
   */
  private async resolveImagePaintWithBackground(
    fill: any,
    layer: any,
    nodeLayout?: { width: number; height: number }
  ): Promise<Paint> {
    const hash = fill.imageHash;
    if (!hash || !this.assets?.images?.[hash]) {
      return {
        type: 'SOLID',
        color: { r: 0.9, g: 0.9, b: 0.9 },
        opacity: 1
      } as SolidPaint;
    }

    // Get or create the Figma image
    let imageHash: string;
    if (this.imagePaintCache.has(hash)) {
      imageHash = this.imagePaintCache.get(hash)!;
    } else {
      try {
        const asset = this.assets.images[hash];
        let imageBytes: Uint8Array | undefined;

        if (asset.base64) {
          imageBytes = this.base64ToUint8Array(asset.base64);
        } else if (asset.url) {
          imageBytes = await this.fetchImage(asset.url);
        }

        if (!imageBytes) {
          throw new Error('No image data available');
        }

        const image = figma.createImage(imageBytes);
        this.imagePaintCache.set(hash, image.hash);
        imageHash = image.hash;
      } catch (error) {
        console.warn('Failed to resolve image paint', error);
        return {
          type: 'SOLID',
          color: { r: 0.9, g: 0.9, b: 0.9 },
          opacity: 1
        } as SolidPaint;
      }
    }

    // Determine scale mode from background-repeat
    const scaleMode = this.getScaleModeFromRepeat(layer.repeat);

    // Calculate image transform from background-position and background-size
    const imageTransform = this.calculateImageTransform(
      layer.position,
      layer.size,
      nodeLayout,
      this.assets.images[hash]
    );

    const paint: ImagePaint = {
      type: 'IMAGE',
      imageHash,
      scaleMode,
      visible: fill.visible !== false
    };

    // Apply transform if calculated
    if (imageTransform) {
      paint.imageTransform = imageTransform;
    }

    // Apply rotation if present
    if (fill.rotation !== undefined) {
      paint.rotation = fill.rotation;
    }

    // Apply scaling factor if needed
    if (fill.scalingFactor !== undefined) {
      paint.scalingFactor = fill.scalingFactor;
    }

    return paint;
  }

  private async resolveImagePaint(fill: any): Promise<Paint> {
    const hash = fill.imageHash;
    if (!hash || !this.assets?.images?.[hash]) {
      return {
        type: 'SOLID',
        color: { r: 0.9, g: 0.9, b: 0.9 },
        opacity: 1
      } as SolidPaint;
    }

    if (this.imagePaintCache.has(hash)) {
      const cachedHash = this.imagePaintCache.get(hash)!;
      
      // Enhanced scale mode mapping from object-fit
      let scaleMode = fill.scaleMode || 'FILL';
      if (fill.objectFit) {
        scaleMode = this.mapObjectFitToScaleMode(fill.objectFit);
      }
      
      const imagePaint: ImagePaint = {
        type: 'IMAGE',
        imageHash: cachedHash,
        scaleMode,
        visible: fill.visible !== false
      };

      // Apply object-position as image transform if specified
      if (fill.objectPosition && fill.objectPosition !== 'center center') {
        imagePaint.imageTransform = this.parseObjectPositionToTransform(fill.objectPosition);
      }

      return imagePaint;
    }

    try {
      const asset = this.assets.images[hash];
      let imageBytes: Uint8Array | undefined;

      if (asset.base64) {
        imageBytes = this.base64ToUint8Array(asset.base64);
      } else if (asset.url) {
        imageBytes = await this.fetchImage(asset.url);
      }

      if (!imageBytes) {
        throw new Error('No image data available');
      }

      const image = figma.createImage(imageBytes);
      this.imagePaintCache.set(hash, image.hash);

      // Enhanced scale mode mapping from object-fit
      let scaleMode = fill.scaleMode || 'FILL';
      if (fill.objectFit) {
        scaleMode = this.mapObjectFitToScaleMode(fill.objectFit);
      }

      const imagePaint: ImagePaint = {
        type: 'IMAGE',
        imageHash: image.hash,
        scaleMode,
        visible: fill.visible !== false
      };

      // Apply object-position as image transform if specified
      if (fill.objectPosition && fill.objectPosition !== 'center center') {
        imagePaint.imageTransform = this.parseObjectPositionToTransform(fill.objectPosition);
      }

      return imagePaint;
    } catch (error) {
      console.warn('Failed to resolve image paint', error);
      return {
        type: 'SOLID',
        color: { r: 0.9, g: 0.9, b: 0.9 },
        opacity: 1
      } as SolidPaint;
    }
  }

  private mapObjectFitToScaleMode(objectFit: string): 'FILL' | 'FIT' | 'CROP' | 'TILE' {
    const mapping: Record<string, 'FILL' | 'FIT' | 'CROP' | 'TILE'> = {
      'fill': 'FILL',        // Stretch to fill completely
      'contain': 'FIT',      // Scale to fit within bounds
      'cover': 'CROP',       // Scale to cover, may crop
      'none': 'CROP',        // Use original size
      'scale-down': 'FIT'    // Similar to contain
    };
    return mapping[objectFit] || 'FILL';
  }

  private getFontMetricsRatio(actualFont: string, originalFont: string): number {
    // Font metrics compensation ratios for common font substitutions
    const fontMetricsMap = new Map([
      // Web fonts → System font ratios (height adjustment factors)
      ['Inter:Arial', 0.98],
      ['Inter:Helvetica', 0.97],
      ['Arial:Inter', 1.02],
      ['Helvetica:Inter', 1.03],
      ['Roboto:Inter', 0.99],
      ['Open Sans:Inter', 1.01],
      ['Lato:Inter', 0.99],
      ['Montserrat:Inter', 1.02],
      ['Source Sans Pro:Inter', 0.98],
      
      // Serif fallbacks
      ['Times New Roman:Times', 1.0],
      ['Georgia:Times New Roman', 0.95],
      
      // Monospace fallbacks
      ['Monaco:Menlo', 1.01],
      ['SF Mono:Monaco', 0.99],
      ['Courier New:Courier', 1.0]
    ]);
    
    const key = `${originalFont}:${actualFont}`;
    return fontMetricsMap.get(key) || 1.0;
  }

  private parseObjectPositionToTransform(objectPosition: string): [[number, number, number], [number, number, number]] {
    // Parse object-position values like "center center", "50% 50%", "left top", etc.
    const parts = objectPosition.trim().split(/\s+/);
    let xOffset = 0;
    let yOffset = 0;

    // Handle horizontal position
    if (parts[0]) {
      if (parts[0] === 'left') xOffset = -0.5;
      else if (parts[0] === 'right') xOffset = 0.5;
      else if (parts[0] === 'center') xOffset = 0;
      else if (parts[0].endsWith('%')) {
        const percent = parseFloat(parts[0]) / 100;
        xOffset = percent - 0.5; // Convert to offset from center
      }
    }

    // Handle vertical position  
    if (parts[1]) {
      if (parts[1] === 'top') yOffset = -0.5;
      else if (parts[1] === 'bottom') yOffset = 0.5;
      else if (parts[1] === 'center') yOffset = 0;
      else if (parts[1].endsWith('%')) {
        const percent = parseFloat(parts[1]) / 100;
        yOffset = percent - 0.5; // Convert to offset from center
      }
    }

    // Return transform matrix with position offsets
    return [
      [1, 0, xOffset],
      [0, 1, yOffset]
    ];
  }

  private async convertStrokesAsync(strokes: any[]): Promise<Paint[]> {
    return strokes.map((stroke) => {
      const color = stroke.color || { r: 0, g: 0, b: 0 };
      const { r, g, b } = color;
      return {
        type: 'SOLID',
        color: { r, g, b },
        opacity: stroke.opacity !== undefined ? stroke.opacity : color.a ?? 1,
        visible: stroke.visible !== false
      };
    }) as SolidPaint[];
  }

  private convertEffects(effects: any[]): Effect[] {
    return effects.map((effect) => {
      if (effect.type === 'DROP_SHADOW') {
        return {
          type: 'DROP_SHADOW',
          color: effect.color,
          offset: effect.offset,
          radius: effect.radius,
          spread: effect.spread || 0,
          visible: effect.visible !== false,
          blendMode: effect.blendMode || 'NORMAL'
        } as DropShadowEffect;
      }

      if (effect.type === 'INNER_SHADOW') {
        return {
          type: 'INNER_SHADOW',
          color: effect.color,
          offset: effect.offset,
          radius: effect.radius,
          spread: effect.spread || 0,
          visible: effect.visible !== false,
          blendMode: effect.blendMode || 'NORMAL'
        } as InnerShadowEffect;
      }

      if (effect.type === 'LAYER_BLUR') {
        return {
          type: 'LAYER_BLUR',
          radius: effect.radius,
          visible: effect.visible !== false
        } as BlurEffect;
      }

      if (effect.type === 'BACKGROUND_BLUR') {
        return {
          type: 'BACKGROUND_BLUR',
          radius: effect.radius,
          visible: effect.visible !== false
        } as BlurEffect;
      }

      return effect;
    });
  }

  /**
   * Convert CSS background-repeat to Figma scaleMode
   */
  private getScaleModeFromRepeat(repeat?: string): 'FILL' | 'FIT' | 'CROP' | 'TILE' {
    if (!repeat) return 'FILL';

    const repeatLower = repeat.toLowerCase().trim();

    // 'repeat' or 'repeat repeat' means tile
    if (repeatLower === 'repeat' || repeatLower === 'repeat repeat') {
      return 'TILE';
    }

    // 'repeat-x' or 'repeat-y' also means tile
    if (repeatLower === 'repeat-x' || repeatLower === 'repeat-y') {
      return 'TILE';
    }

    // 'no-repeat' with other properties will be handled by imageTransform
    // Default to FILL for 'no-repeat', 'space', 'round'
    return 'FILL';
  }

  /**
   * Calculate Figma imageTransform from CSS background-position and background-size
   * Returns a 2x3 transform matrix: [[a, b, c], [d, e, f]]
   */
  private calculateImageTransform(
    position?: { x: string; y: string },
    size?: { width: string; height: string },
    nodeLayout?: { width: number; height: number },
    imageAsset?: { width: number; height: number }
  ): [[number, number, number], [number, number, number]] | undefined {
    // If we don't have enough info, skip transform
    if (!position && !size) return undefined;

    // Start with identity matrix
    let scaleX = 1;
    let scaleY = 1;
    let translateX = 0;
    let translateY = 0;

    // Process background-size
    if (size && nodeLayout && imageAsset) {
      const { width: sizeWidth, height: sizeHeight } = size;

      // Handle 'cover' - scale to cover the entire area
      if (sizeWidth === 'cover') {
        const scaleRatio = Math.max(
          nodeLayout.width / imageAsset.width,
          nodeLayout.height / imageAsset.height
        );
        scaleX = scaleRatio;
        scaleY = scaleRatio;
      }
      // Handle 'contain' - scale to fit within the area
      else if (sizeWidth === 'contain') {
        const scaleRatio = Math.min(
          nodeLayout.width / imageAsset.width,
          nodeLayout.height / imageAsset.height
        );
        scaleX = scaleRatio;
        scaleY = scaleRatio;
      }
      // Handle 'auto' or specific dimensions
      else {
        scaleX = this.parseSizeValue(sizeWidth, nodeLayout.width, imageAsset.width);
        scaleY = this.parseSizeValue(sizeHeight || sizeWidth, nodeLayout.height, imageAsset.height);
      }
    }

    // Process background-position
    if (position && nodeLayout && imageAsset) {
      const { x: posX, y: posY } = position;

      // Calculate effective image dimensions after scaling
      const scaledImageWidth = imageAsset.width * scaleX;
      const scaledImageHeight = imageAsset.height * scaleY;

      translateX = this.parsePositionValue(posX, nodeLayout.width, scaledImageWidth);
      translateY = this.parsePositionValue(posY, nodeLayout.height, scaledImageHeight);

      // Normalize to Figma's coordinate system (0-1 range relative to image size)
      if (imageAsset.width > 0) {
        translateX = translateX / imageAsset.width;
      }
      if (imageAsset.height > 0) {
        translateY = translateY / imageAsset.height;
      }
    }

    // Return the transform matrix: [[scaleX, 0, translateX], [0, scaleY, translateY]]
    return [
      [scaleX, 0, translateX],
      [0, scaleY, translateY]
    ];
  }

  /**
   * Parse CSS size value (e.g., "100px", "50%", "auto") to a scale factor
   */
  private parseSizeValue(value: string, containerSize: number, imageSize: number): number {
    const trimmed = value.trim().toLowerCase();

    if (trimmed === 'auto') {
      return 1; // Use intrinsic size
    }

    if (trimmed.endsWith('%')) {
      const percentage = parseFloat(trimmed);
      return (containerSize * (percentage / 100)) / imageSize;
    }

    if (trimmed.endsWith('px')) {
      const pixels = parseFloat(trimmed);
      return pixels / imageSize;
    }

    // Try to parse as number (assumed pixels)
    const num = parseFloat(trimmed);
    if (!isNaN(num)) {
      return num / imageSize;
    }

    return 1; // Default
  }

  /**
   * Parse CSS position value (e.g., "center", "50%", "10px", "left", "right", "top", "bottom")
   * Returns position in pixels
   */
  private parsePositionValue(value: string, containerSize: number, imageSize: number): number {
    const trimmed = value.trim().toLowerCase();

    // Handle keywords
    const keywordMap: Record<string, number> = {
      left: 0,
      top: 0,
      center: 0.5,
      right: 1,
      bottom: 1
    };

    if (trimmed in keywordMap) {
      const ratio = keywordMap[trimmed];
      return (containerSize - imageSize) * ratio;
    }

    // Handle percentage
    if (trimmed.endsWith('%')) {
      const percentage = parseFloat(trimmed) / 100;
      return (containerSize - imageSize) * percentage;
    }

    // Handle pixels
    if (trimmed.endsWith('px')) {
      return parseFloat(trimmed);
    }

    // Try to parse as number (assumed pixels)
    const num = parseFloat(trimmed);
    if (!isNaN(num)) {
      return num;
    }

    return 0; // Default to 0
  }

  private async fetchImage(url: string): Promise<Uint8Array> {
    if (this.imageFetchCache.has(url)) {
      return this.imageFetchCache.get(url)!;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    this.imageFetchCache.set(url, bytes);
    return bytes;
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const normalized = base64.includes(',') ? base64.split(',')[1] : base64;
    const binary = atob(normalized);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  private mapFontWeight(weight: number): string {
    const map: Record<number, string> = {
      100: 'Thin',
      200: 'Extra Light',
      300: 'Light',
      400: 'Regular',
      500: 'Medium',
      600: 'Semi Bold',
      700: 'Bold',
      800: 'Extra Bold',
      900: 'Black'
    };
    return map[weight] || 'Regular';
  }

  private safeSetPluginData(node: SceneNode, key: string, value: string) {
    try {
      node.setPluginData(key, value);
    } catch {
      // Ignore plugin data errors for nodes that cannot store plugin data (rare)
    }
  }
}
