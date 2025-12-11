/**
 * Hover State to Figma Variant Mapper
 * Converts hoverStates captured by Puppeteer into Figma component variants
 */

interface HoverState {
  id: string;
  default: Record<string, string>;
  hover: Record<string, string>;
}

interface VariantCreationResult {
  componentSet: ComponentSetNode | null;
  defaultVariant: ComponentNode | null;
  hoverVariant: ComponentNode | null;
  success: boolean;
  error?: string;
}

/**
 * Create Figma component variants from hover state data
 */
export async function createHoverVariants(
  hoverStates: HoverState[],
  nodeMap: Map<string, SceneNode>
): Promise<Map<string, VariantCreationResult>> {
  const results = new Map<string, VariantCreationResult>();

  if (!hoverStates?.length) {
    console.log("ℹ️ No hover states to process");
    return results;
  }

  console.log(`🎭 Processing ${hoverStates.length} hover states...`);

  for (const state of hoverStates) {
    try {
      const node = nodeMap.get(state.id);
      if (!node || !("type" in node) || node.type === "TEXT") {
        continue; // Skip text nodes and missing nodes
      }

      const result = await createVariantFromHoverState(node, state);
      results.set(state.id, result);
    } catch (error) {
      console.warn(`⚠️ Failed to create variant for ${state.id}:`, error);
      results.set(state.id, {
        componentSet: null,
        defaultVariant: null,
        hoverVariant: null,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const successCount = Array.from(results.values()).filter(
    (r) => r.success
  ).length;
  console.log(
    `✅ Created ${successCount}/${hoverStates.length} hover variants`
  );

  return results;
}

/**
 * Convert a single node with hover state into a component set with variants
 */
async function createVariantFromHoverState(
  node: SceneNode,
  state: HoverState
): Promise<VariantCreationResult> {
  // Only process frame-like nodes
  if (!("children" in node)) {
    return {
      componentSet: null,
      defaultVariant: null,
      hoverVariant: null,
      success: false,
    };
  }

  const frame = node as FrameNode;

  // Clone the frame for the default variant
  const defaultVariant = figma.createComponent();
  defaultVariant.name = "State=Default";
  defaultVariant.resize(frame.width, frame.height);
  copyNodeProperties(frame, defaultVariant);

  // Clone for hover variant
  const hoverVariant = figma.createComponent();
  hoverVariant.name = "State=Hover";
  hoverVariant.resize(frame.width, frame.height);
  copyNodeProperties(frame, hoverVariant);

  // Apply hover style differences
  applyHoverStyles(hoverVariant, state.default, state.hover);

  // Create ComponentSet containing both variants
  const componentSet = figma.combineAsVariants(
    [defaultVariant, hoverVariant],
    figma.currentPage
  );
  componentSet.name = `${frame.name} (Interactive)`;

  // Position near the original
  componentSet.x = frame.x;
  componentSet.y = frame.y + frame.height + 20;

  // Replace original node with instance of default variant
  const instance = defaultVariant.createInstance();
  if (frame.parent) {
    const index = frame.parent.children.indexOf(frame);
    if (index >= 0) {
      (frame.parent as ChildrenMixin).insertChild(index, instance);
      frame.remove();
    }
  }

  return {
    componentSet,
    defaultVariant,
    hoverVariant,
    success: true,
  };
}

/**
 * Copy node properties from source to target
 */
function copyNodeProperties(source: FrameNode, target: FrameNode): void {
  // Copy fills
  if (source.fills && source.fills !== figma.mixed) {
    target.fills = JSON.parse(JSON.stringify(source.fills));
  }

  // Copy strokes
  if (source.strokes) {
    target.strokes = JSON.parse(JSON.stringify(source.strokes));
  }

  // Copy effects
  if (source.effects) {
    target.effects = JSON.parse(JSON.stringify(source.effects));
  }

  // Copy corner radius
  if (typeof source.cornerRadius === "number") {
    target.cornerRadius = source.cornerRadius;
  }

  // Copy padding
  target.paddingLeft = source.paddingLeft;
  target.paddingRight = source.paddingRight;
  target.paddingTop = source.paddingTop;
  target.paddingBottom = source.paddingBottom;
}

/**
 * Apply hover style differences to a variant
 */
function applyHoverStyles(
  variant: ComponentNode,
  defaultStyles: Record<string, string>,
  hoverStyles: Record<string, string>
): void {
  // Find style differences and apply them
  for (const [prop, hoverValue] of Object.entries(hoverStyles)) {
    if (defaultStyles[prop] !== hoverValue) {
      applyStyleProperty(variant, prop, hoverValue);
    }
  }
}

/**
 * Apply a single CSS style property to a Figma node
 */
function applyStyleProperty(
  node: ComponentNode,
  prop: string,
  value: string
): void {
  switch (prop) {
    case "backgroundColor":
      const bgColor = parseColor(value);
      if (bgColor) {
        node.fills = [
          {
            type: "SOLID",
            color: bgColor.color,
            opacity: bgColor.opacity,
          },
        ];
      }
      break;

    case "opacity":
      node.opacity = parseFloat(value) || 1;
      break;

    case "transform":
      // Transform changes are complex, store as metadata
      node.setPluginData("hoverTransform", value);
      break;

    case "boxShadow":
      const shadow = parseBoxShadow(value);
      if (shadow) {
        node.effects = [shadow];
      }
      break;
  }
}

/**
 * Parse CSS color to Figma format
 */
function parseColor(color: string): { color: RGB; opacity: number } | null {
  // Handle rgba
  const rgbaMatch = color.match(
    /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/
  );
  if (rgbaMatch) {
    return {
      color: {
        r: parseInt(rgbaMatch[1]) / 255,
        g: parseInt(rgbaMatch[2]) / 255,
        b: parseInt(rgbaMatch[3]) / 255,
      },
      opacity: rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1,
    };
  }

  // Handle hex
  const hexMatch = color.match(/^#([0-9a-f]{6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    return {
      color: {
        r: parseInt(hex.slice(0, 2), 16) / 255,
        g: parseInt(hex.slice(2, 4), 16) / 255,
        b: parseInt(hex.slice(4, 6), 16) / 255,
      },
      opacity: 1,
    };
  }

  return null;
}

/**
 * Parse CSS box-shadow to Figma effect
 */
function parseBoxShadow(shadow: string): DropShadowEffect | null {
  // Basic box-shadow parsing: offsetX offsetY blur spread color
  const match = shadow.match(
    /(-?\d+)px\s+(-?\d+)px\s+(\d+)px(?:\s+(\d+)px)?\s+(rgba?\([^)]+\)|#[0-9a-f]{6})/i
  );
  if (!match) return null;

  const offsetX = parseInt(match[1]);
  const offsetY = parseInt(match[2]);
  const blur = parseInt(match[3]);
  const colorStr = match[5];
  const colorParsed = parseColor(colorStr);

  if (!colorParsed) return null;

  return {
    type: "DROP_SHADOW",
    color: { ...colorParsed.color, a: colorParsed.opacity },
    offset: { x: offsetX, y: offsetY },
    radius: blur,
    spread: match[4] ? parseInt(match[4]) : 0,
    visible: true,
    blendMode: "NORMAL",
  };
}
