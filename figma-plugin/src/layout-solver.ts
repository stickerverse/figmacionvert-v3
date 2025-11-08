interface ElementNodeData {
  layout?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
  autoLayout?: {
    layoutMode?: 'VERTICAL' | 'HORIZONTAL' | 'NONE';
    itemSpacing?: number;
  };
  children?: ElementNodeData[];
}

const POSITION_TOLERANCE = 4; // px

export function prepareLayoutSchema(schema: any): void {
  if (!schema?.tree) return;
  traverseNode(schema.tree);
}

function traverseNode(node: ElementNodeData | undefined | null): void {
  if (!node) return;

  if (shouldAttemptAutoLayout(node)) {
    const convertible = canUseAutoLayout(node);
    if (!convertible) {
      disableAutoLayout(node);
    } else {
      resetChildOffsets(node);
    }
  }

  for (const child of node.children || []) {
    traverseNode(child);
  }
}

function shouldAttemptAutoLayout(node: ElementNodeData): boolean {
  return false;
}

function canUseAutoLayout(node: ElementNodeData): boolean {
  if (!node.children || node.children.length <= 1) return true;
  const axis = node.autoLayout?.layoutMode || 'NONE';
  const positions = node.children.map((child, index) => ({
    index,
    x: child.layout?.x ?? 0,
    y: child.layout?.y ?? 0
  }));

  if (axis === 'VERTICAL') {
    return isMonotonic(positions, 'y') && isAligned(positions, 'x');
  }

  if (axis === 'HORIZONTAL') {
    return isMonotonic(positions, 'x') && isAligned(positions, 'y');
  }

  return false;
}

function isMonotonic(
  positions: Array<{ index: number; x: number; y: number }>,
  axis: 'x' | 'y'
): boolean {
  const sorted = [...positions].sort((a, b) => a[axis] - b[axis]);
  for (let i = 0; i < positions.length; i++) {
    if (sorted[i].index !== positions[i].index) {
      return false;
    }
  }

  for (let i = 1; i < positions.length; i++) {
    if (sorted[i][axis] + POSITION_TOLERANCE < sorted[i - 1][axis]) {
      return false;
    }
  }

  return true;
}

function isAligned(
  positions: Array<{ index: number; x: number; y: number }>,
  axis: 'x' | 'y'
): boolean {
  if (positions.length <= 1) return true;
  const baseline = positions[0][axis];
  return positions.every((pos) => Math.abs(pos[axis] - baseline) <= POSITION_TOLERANCE);
}

function disableAutoLayout(node: ElementNodeData): void {
  if (!node.autoLayout) return;
  node.autoLayout.layoutMode = 'NONE';
}

function resetChildOffsets(node: ElementNodeData): void {
  if (!node.children) return;
  for (const child of node.children) {
    if (child.layout) {
      child.layout.x = 0;
      child.layout.y = 0;
    }
  }
}
