type XYWH = { x: number; y: number; width: number; height: number };
type ChildBox = { node: SceneNode; x: number; y: number; w: number; h: number };

const POSITION_THRESHOLD = 0.5;
const OVERLAP_THRESHOLD = 2; // pixels
const MIN_GAP_VARIANCE_RATIO = 0.3; // 30% variance to consider consistent spacing
const MIN_ALIGNMENT_THRESHOLD = 0.1; // 10% of container dimension

// Direction detection confidence levels
type DirectionConfidence = {
  direction: 'HORIZONTAL' | 'VERTICAL';
  confidence: number; // 0-1, where 1 is highest confidence
  reason: string;
  metrics: {
    alignmentScore: number;
    spacingConsistency: number;
    wrapDetection: boolean;
    gridPattern: boolean;
  };
};

function absBox(node: SceneNode): XYWH {
  const transform = node.absoluteTransform;
  const x = transform[0][2];
  const y = transform[1][2];
  return { x, y, width: node.width, height: node.height };
}

function sortVisual(a: ChildBox, b: ChildBox) {
  if (Math.abs(a.y - b.y) > POSITION_THRESHOLD) return a.y - b.y;
  return a.x - b.x;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function calculateAlignmentScore(children: ChildBox[], direction: 'horizontal' | 'vertical'): number {
  if (children.length < 2) return 1.0;
  
  const alignmentTolerance = 5; // pixels
  let alignedCount = 0;
  
  if (direction === 'horizontal') {
    // Check if elements align horizontally (same y position)
    const yPositions = children.map(child => child.y);
    const commonY = median(yPositions);
    alignedCount = children.filter(child => Math.abs(child.y - commonY) <= alignmentTolerance).length;
  } else {
    // Check if elements align vertically (same x position)
    const xPositions = children.map(child => child.x);
    const commonX = median(xPositions);
    alignedCount = children.filter(child => Math.abs(child.x - commonX) <= alignmentTolerance).length;
  }
  
  return alignedCount / children.length;
}

function analyzeSpacingPattern(children: ChildBox[], direction: 'horizontal' | 'vertical'): {
  consistency: number;
  averageGap: number;
  gaps: number[];
} {
  if (children.length < 2) {
    return { consistency: 1.0, averageGap: 0, gaps: [] };
  }
  
  const gaps: number[] = [];
  const sorted = children.slice().sort(sortVisual);
  
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    
    let gap: number;
    if (direction === 'horizontal') {
      gap = cur.x - (prev.x + prev.w);
    } else {
      gap = cur.y - (prev.y + prev.h);
    }
    
    // Only consider positive gaps (elements not overlapping)
    if (gap >= -OVERLAP_THRESHOLD) {
      gaps.push(Math.max(0, gap));
    }
  }
  
  if (gaps.length === 0) {
    return { consistency: 0, averageGap: 0, gaps: [] };
  }
  
  const averageGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  const variance = gaps.reduce((sum, gap) => sum + Math.pow(gap - averageGap, 2), 0) / gaps.length;
  const standardDeviation = Math.sqrt(variance);
  
  // Consistency is inversely related to coefficient of variation
  const coefficientOfVariation = averageGap > 0 ? standardDeviation / averageGap : 1;
  const consistency = Math.max(0, 1 - coefficientOfVariation);
  
  return { consistency, averageGap, gaps };
}

function detectWrappingPattern(children: ChildBox[], containerBounds: XYWH): {
  hasWrapping: boolean;
  favorHorizontal: boolean;
  favorVertical: boolean;
  wrapLines: number;
} {
  if (children.length < 3) {
    return { hasWrapping: false, favorHorizontal: false, favorVertical: false, wrapLines: 1 };
  }
  
  // Group elements by approximate Y position (for horizontal wrapping)
  const rowTolerance = 10; // pixels
  const rows: ChildBox[][] = [];
  const sortedByY = children.slice().sort((a, b) => a.y - b.y);
  
  let currentRow: ChildBox[] = [sortedByY[0]];
  let currentRowY = sortedByY[0].y;
  
  for (let i = 1; i < sortedByY.length; i++) {
    const child = sortedByY[i];
    if (Math.abs(child.y - currentRowY) <= rowTolerance) {
      currentRow.push(child);
    } else {
      rows.push(currentRow);
      currentRow = [child];
      currentRowY = child.y;
    }
  }
  if (currentRow.length > 0) rows.push(currentRow);
  
  // Group elements by approximate X position (for vertical wrapping)
  const colTolerance = 10; // pixels
  const cols: ChildBox[][] = [];
  const sortedByX = children.slice().sort((a, b) => a.x - b.x);
  
  let currentCol: ChildBox[] = [sortedByX[0]];
  let currentColX = sortedByX[0].x;
  
  for (let i = 1; i < sortedByX.length; i++) {
    const child = sortedByX[i];
    if (Math.abs(child.x - currentColX) <= colTolerance) {
      currentCol.push(child);
    } else {
      cols.push(currentCol);
      currentCol = [child];
      currentColX = child.x;
    }
  }
  if (currentCol.length > 0) cols.push(currentCol);
  
  const hasHorizontalWrapping = rows.length > 1 && rows.some(row => row.length > 1);
  const hasVerticalWrapping = cols.length > 1 && cols.some(col => col.length > 1);
  
  return {
    hasWrapping: hasHorizontalWrapping || hasVerticalWrapping,
    favorHorizontal: hasHorizontalWrapping && rows.length >= cols.length,
    favorVertical: hasVerticalWrapping && cols.length > rows.length,
    wrapLines: Math.max(rows.length, cols.length)
  };
}

function detectGridPattern(children: ChildBox[], containerBounds: XYWH): {
  isGrid: boolean;
  rows: number;
  columns: number;
  primaryDirection: 'HORIZONTAL' | 'VERTICAL';
  cellWidth?: number;
  cellHeight?: number;
} {
  if (children.length < 4) { // Need at least 2x2 for a grid
    return { isGrid: false, rows: 1, columns: children.length, primaryDirection: 'HORIZONTAL' };
  }
  
  // Try to detect regular grid patterns by analyzing position clustering
  const tolerance = 15; // pixels
  
  // Group by Y positions to find rows
  const yGroups: { y: number; children: ChildBox[] }[] = [];
  children.forEach(child => {
    let found = false;
    for (const group of yGroups) {
      if (Math.abs(group.y - child.y) <= tolerance) {
        group.children.push(child);
        found = true;
        break;
      }
    }
    if (!found) {
      yGroups.push({ y: child.y, children: [child] });
    }
  });
  
  // Group by X positions to find columns
  const xGroups: { x: number; children: ChildBox[] }[] = [];
  children.forEach(child => {
    let found = false;
    for (const group of xGroups) {
      if (Math.abs(group.x - child.x) <= tolerance) {
        group.children.push(child);
        found = true;
        break;
      }
    }
    if (!found) {
      xGroups.push({ x: child.x, children: [child] });
    }
  });
  
  const rows = yGroups.length;
  const columns = xGroups.length;
  
  // Check if it forms a regular grid (each row should have similar number of items)
  const avgItemsPerRow = children.length / rows;
  const isRegularRows = yGroups.every(group => 
    Math.abs(group.children.length - avgItemsPerRow) <= 1
  );
  
  const avgItemsPerCol = children.length / columns;
  const isRegularCols = xGroups.every(group => 
    Math.abs(group.children.length - avgItemsPerCol) <= 1
  );
  
  const isGrid = (rows >= 2 && columns >= 2) && (isRegularRows || isRegularCols) && 
                 (rows * columns >= children.length * 0.8); // Allow for some missing cells
  
  let cellWidth, cellHeight;
  if (isGrid && yGroups.length > 0 && xGroups.length > 0) {
    // Calculate average cell dimensions
    cellWidth = (containerBounds.width - (columns - 1) * 10) / columns; // Assume 10px gap
    cellHeight = (containerBounds.height - (rows - 1) * 10) / rows;
  }
  
  return {
    isGrid,
    rows,
    columns,
    primaryDirection: rows > columns ? 'VERTICAL' : 'HORIZONTAL',
    cellWidth,
    cellHeight
  };
}

function inferDirectionEnhanced(children: ChildBox[], containerBounds: XYWH): DirectionConfidence {
  if (children.length <= 1) {
    return {
      direction: 'HORIZONTAL',
      confidence: 1.0,
      reason: 'Single or no children - default to horizontal',
      metrics: { alignmentScore: 1, spacingConsistency: 1, wrapDetection: false, gridPattern: false }
    };
  }

  // Sort children by visual reading order (top-left to bottom-right)
  const sorted = children.slice().sort(sortVisual);
  
  // Analyze alignment patterns
  const horizontalAlignmentScore = calculateAlignmentScore(sorted, 'horizontal');
  const verticalAlignmentScore = calculateAlignmentScore(sorted, 'vertical');
  
  // Analyze spacing consistency
  const horizontalSpacing = analyzeSpacingPattern(sorted, 'horizontal');
  const verticalSpacing = analyzeSpacingPattern(sorted, 'vertical');
  
  // Detect wrapping behavior
  const wrapAnalysis = detectWrappingPattern(sorted, containerBounds);
  
  // Detect grid-like patterns
  const gridPattern = detectGridPattern(sorted, containerBounds);
  
  // Calculate confidence scores
  let horizontalScore = 0;
  let verticalScore = 0;
  let reason = '';
  
  // Grid patterns override other considerations
  if (gridPattern.isGrid) {
    if (gridPattern.primaryDirection === 'HORIZONTAL') {
      horizontalScore = 0.9;
      reason = `Grid pattern detected: ${gridPattern.columns} columns, ${gridPattern.rows} rows`;
    } else {
      verticalScore = 0.9;
      reason = `Grid pattern detected: ${gridPattern.rows} rows, ${gridPattern.columns} columns`;
    }
  } else {
    // Weight factors for direction determination
    const alignmentWeight = 0.4;
    const spacingWeight = 0.3;
    const wrapWeight = 0.3;
    
    horizontalScore = 
      (horizontalAlignmentScore * alignmentWeight) +
      (horizontalSpacing.consistency * spacingWeight) +
      (wrapAnalysis.favorHorizontal ? wrapWeight : 0);
    
    verticalScore = 
      (verticalAlignmentScore * alignmentWeight) +
      (verticalSpacing.consistency * spacingWeight) +
      (wrapAnalysis.favorVertical ? wrapWeight : 0);
    
    reason = `Alignment: H${horizontalAlignmentScore.toFixed(2)} V${verticalAlignmentScore.toFixed(2)}, ` +
             `Spacing: H${horizontalSpacing.consistency.toFixed(2)} V${verticalSpacing.consistency.toFixed(2)}, ` +
             `Wrap: ${wrapAnalysis.favorHorizontal ? 'H' : wrapAnalysis.favorVertical ? 'V' : 'None'}`;
  }
  
  const direction = horizontalScore > verticalScore ? 'HORIZONTAL' : 'VERTICAL';
  const confidence = Math.abs(horizontalScore - verticalScore);
  
  return {
    direction,
    confidence: Math.min(Math.max(confidence, 0.1), 1.0),
    reason,
    metrics: {
      alignmentScore: direction === 'HORIZONTAL' ? horizontalAlignmentScore : verticalAlignmentScore,
      spacingConsistency: direction === 'HORIZONTAL' ? horizontalSpacing.consistency : verticalSpacing.consistency,
      wrapDetection: wrapAnalysis.hasWrapping,
      gridPattern: gridPattern.isGrid
    }
  };
}

// Legacy wrapper for backward compatibility
function inferDirection(children: ChildBox[]): 'HORIZONTAL' | 'VERTICAL' {
  // Use a minimal container bounds for legacy compatibility
  const bounds = { x: 0, y: 0, width: 1000, height: 1000 };
  return inferDirectionEnhanced(children, bounds).direction;
}

function computePadding(container: FrameNode | GroupNode, kids: ChildBox[]) {
  const c = absBox(container as SceneNode);
  const left = Math.max(0, Math.min(...kids.map((k) => k.x)) - c.x);
  const top = Math.max(0, Math.min(...kids.map((k) => k.y)) - c.y);
  const right = Math.max(0, c.x + c.width - Math.max(...kids.map((k) => k.x + k.w)));
  const bottom = Math.max(0, c.y + c.height - Math.max(...kids.map((k) => k.y + k.h)));
  const round = (n: number) => Math.max(0, Math.round(n * 100) / 100);
  return { top: round(top), right: round(right), bottom: round(bottom), left: round(left) };
}

function computeItemSpacing(dir: 'HORIZONTAL' | 'VERTICAL', kids: ChildBox[]) {
  const gaps: number[] = [];
  const sorted = kids.slice().sort(sortVisual);
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1];
    const b = sorted[i];
    if (dir === 'HORIZONTAL') gaps.push(b.x - (a.x + a.w));
    else gaps.push(b.y - (a.y + a.h));
  }
  return Math.max(0, Math.round(median(gaps) * 100) / 100);
}

function inferAlignment(
  dir: 'HORIZONTAL' | 'VERTICAL',
  container: XYWH,
  kids: ChildBox[]
) {
  const gaps: number[] = [];
  const sorted = kids.slice().sort(sortVisual);
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1];
    const b = sorted[i];
    gaps.push(dir === 'HORIZONTAL' ? b.x - (a.x + a.w) : b.y - (a.y + a.h));
  }
  const gMed = median(gaps);
  const variance = median(gaps.map((g) => Math.abs(g - gMed)));
  const primary: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN' =
    gaps.length >= 2 && variance > gMed * 0.5 ? 'SPACE_BETWEEN' : 'MIN';

  const cCenterX = container.x + container.width / 2;
  const cCenterY = container.y + container.height / 2;
  const centers = kids.map((k) => ({ cx: k.x + k.w / 2, cy: k.y + k.h / 2 }));
  const avgCx = centers.reduce((s, v) => s + v.cx, 0) / centers.length;
  const avgCy = centers.reduce((s, v) => s + v.cy, 0) / centers.length;

  let counter: 'MIN' | 'CENTER' | 'MAX' = 'MIN';
  if (dir === 'HORIZONTAL') {
    const off = avgCy - cCenterY;
    counter = Math.abs(off) < container.height * 0.05 ? 'CENTER' : off > 0 ? 'MAX' : 'MIN';
  } else {
    const off = avgCx - cCenterX;
    counter = Math.abs(off) < container.width * 0.05 ? 'CENTER' : off > 0 ? 'MAX' : 'MIN';
  }
  return { primary, counter };
}

function ensureFrame(container: FrameNode | GroupNode): FrameNode {
  if (container.type === 'FRAME') return container;
  const group = container as GroupNode;
  const frame = figma.createFrame();
  const bounds = absBox(group);
  frame.x = bounds.x;
  frame.y = bounds.y;
  frame.resizeWithoutConstraints(bounds.width, bounds.height);
  frame.clipsContent = false;
  frame.layoutMode = 'NONE';

  const children = group.children.slice();
  for (const child of children) {
    frame.appendChild(child);
    if ('constraints' in child) {
      child.constraints = { horizontal: 'MIN', vertical: 'MIN' };
    }
    const childBox = absBox(child as SceneNode);
    child.x = childBox.x - frame.x;
    child.y = childBox.y - frame.y;
  }
  group.remove();
  return frame;
}

function convertGridToNestedAutoLayout(
  frame: FrameNode,
  kids: ChildBox[],
  gridData?: { templateColumns: string; templateRows: string; columnGap: number; rowGap: number }
): FrameNode | null {
  if (!gridData || kids.length < 2) return null;

  // Parse grid template to understand structure
  const columns = gridData.templateColumns.split(/\s+/).filter(col => col !== 'none').length;
  const rows = gridData.templateRows.split(/\s+/).filter(row => row !== 'none').length;
  
  if (columns < 2 && rows < 2) return null;

  console.log(`Converting CSS Grid: ${rows} rows x ${columns} columns`);

  // Group children by grid position
  const cellSize = {
    width: (frame.width - (columns - 1) * gridData.columnGap) / columns,
    height: (frame.height - (rows - 1) * gridData.rowGap) / rows
  };

  // Create grid structure with nested Auto Layout
  // Primary direction is based on whether we have more rows or columns
  const isRowPrimary = rows >= columns;
  
  if (isRowPrimary) {
    // Create vertical container with row frames
    frame.layoutMode = 'VERTICAL';
    frame.itemSpacing = gridData.rowGap;
    
    // Group children by rows
    const rowGroups: ChildBox[][] = Array(rows).fill(null).map(() => []);
    kids.forEach(kid => {
      const row = Math.floor(kid.y / (cellSize.height + gridData.rowGap));
      if (row < rows) {
        rowGroups[row].push(kid);
      }
    });

    // Create row frames
    rowGroups.forEach((rowKids, rowIndex) => {
      if (rowKids.length === 0) return;
      
      const rowFrame = figma.createFrame();
      rowFrame.name = `Grid Row ${rowIndex + 1}`;
      rowFrame.layoutMode = 'HORIZONTAL';
      rowFrame.itemSpacing = gridData.columnGap;
      rowFrame.fills = [];
      rowFrame.resize(frame.width, cellSize.height);
      
      // Sort children in row by x position
      rowKids.sort((a, b) => a.x - b.x);
      
      // Move children to row frame
      rowKids.forEach(kid => {
        rowFrame.appendChild(kid.node);
        kid.node.x = 0;
        kid.node.y = 0;
        if ('layoutPositioning' in kid.node) {
          (kid.node as any).layoutPositioning = 'AUTO';
        }
      });
      
      frame.appendChild(rowFrame);
    });
  } else {
    // Create horizontal container with column frames
    frame.layoutMode = 'HORIZONTAL';
    frame.itemSpacing = gridData.columnGap;
    
    // Group children by columns
    const colGroups: ChildBox[][] = Array(columns).fill(null).map(() => []);
    kids.forEach(kid => {
      const col = Math.floor(kid.x / (cellSize.width + gridData.columnGap));
      if (col < columns) {
        colGroups[col].push(kid);
      }
    });

    // Create column frames
    colGroups.forEach((colKids, colIndex) => {
      if (colKids.length === 0) return;
      
      const colFrame = figma.createFrame();
      colFrame.name = `Grid Column ${colIndex + 1}`;
      colFrame.layoutMode = 'VERTICAL';
      colFrame.itemSpacing = gridData.rowGap;
      colFrame.fills = [];
      colFrame.resize(cellSize.width, frame.height);
      
      // Sort children in column by y position
      colKids.sort((a, b) => a.y - b.y);
      
      // Move children to column frame
      colKids.forEach(kid => {
        colFrame.appendChild(kid.node);
        kid.node.x = 0;
        kid.node.y = 0;
        if ('layoutPositioning' in kid.node) {
          (kid.node as any).layoutPositioning = 'AUTO';
        }
      });
      
      frame.appendChild(colFrame);
    });
  }

  return frame;
}

type LayoutDecision = {
  useAutoLayout: boolean;
  confidence: number;
  reason: string;
  factors: {
    overlapping: number;
    complexPositioning: number;
    gridLike: number;
    transformUsage: number;
    cssPositioning: number;
  };
};

function analyzeLayoutCompatibility(
  frame: FrameNode,
  kids: ChildBox[], 
  frameBox: XYWH,
  directionAnalysis: DirectionConfidence
): LayoutDecision {
  let score = 0;
  let reasons: string[] = [];
  const factors = {
    overlapping: 0,
    complexPositioning: 0,
    gridLike: 0,
    transformUsage: 0,
    cssPositioning: 0
  };

  // Check for overlapping elements (negative factor)
  const overlappingCount = countOverlappingElements(kids);
  if (overlappingCount > 0) {
    factors.overlapping = overlappingCount / kids.length;
    score -= factors.overlapping * 0.4;
    reasons.push(`${overlappingCount} overlapping elements`);
  }

  // Check for complex CSS positioning
  const positionedElements = countPositionedElements(kids);
  if (positionedElements > 0) {
    factors.cssPositioning = positionedElements / kids.length;
    score -= factors.cssPositioning * 0.3;
    reasons.push(`${positionedElements} absolutely/fixed positioned elements`);
  }

  // Check for transform usage
  const transformedElements = countTransformedElements(kids);
  if (transformedElements > 0) {
    factors.transformUsage = transformedElements / kids.length;
    score -= factors.transformUsage * 0.2;
    reasons.push(`${transformedElements} transformed elements`);
  }

  // Check grid-like patterns (positive factor)
  if (directionAnalysis.metrics.gridPattern) {
    factors.gridLike = 0.8;
    score += 0.3;
    reasons.push('grid-like pattern detected');
  }

  // Check alignment quality (positive factor)
  if (directionAnalysis.metrics.alignmentScore > 0.7) {
    score += 0.2;
    reasons.push(`good alignment (${directionAnalysis.metrics.alignmentScore.toFixed(2)})`);
  }

  // Check spacing consistency (positive factor)
  if (directionAnalysis.metrics.spacingConsistency > 0.8) {
    score += 0.2;
    reasons.push(`consistent spacing (${directionAnalysis.metrics.spacingConsistency.toFixed(2)})`);
  }

  // Direction confidence factor
  score += directionAnalysis.confidence * 0.1;

  // Base score for simple layouts
  if (kids.length <= 5 && factors.overlapping === 0) {
    score += 0.2;
    reasons.push('simple layout');
  }

  const useAutoLayout = score > 0.1; // Threshold for Auto Layout usage
  const confidence = Math.min(Math.abs(score), 1.0);

  return {
    useAutoLayout,
    confidence,
    reason: useAutoLayout ? 
      `Suitable for Auto Layout: ${reasons.join(', ')}` : 
      `Keep absolute positioning: ${reasons.join(', ')}`,
    factors
  };
}

function countOverlappingElements(kids: ChildBox[]): number {
  let count = 0;
  for (let i = 0; i < kids.length; i++) {
    for (let j = i + 1; j < kids.length; j++) {
      const a = kids[i];
      const b = kids[j];
      const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (overlapX > OVERLAP_THRESHOLD && overlapY > OVERLAP_THRESHOLD) {
        count++;
      }
    }
  }
  return count;
}

function countPositionedElements(kids: ChildBox[]): number {
  return kids.filter(kid => {
    const position = kid.node.getPluginData('cssPosition');
    return position === 'absolute' || position === 'fixed' || position === 'sticky';
  }).length;
}

function countTransformedElements(kids: ChildBox[]): number {
  return kids.filter(kid => {
    const transform = kid.node.getPluginData('cssTransform');
    return transform && transform !== 'none' && transform !== '';
  }).length;
}

export function upgradeToAutoLayout(container: FrameNode | GroupNode): FrameNode | null {
  const frame = ensureFrame(container);
  const kids: ChildBox[] = frame.children
    .filter((child) => child.visible)
    .map((node) => {
      const box = absBox(node as SceneNode);
      return { node: node as SceneNode, x: box.x, y: box.y, w: box.width, h: box.height };
    });

  if (!kids.length) return frame;

  const frameBox = absBox(frame);
  for (const kid of kids) {
    kid.node.x = kid.x - frameBox.x;
    kid.node.y = kid.y - frameBox.y;
  }

  // Check if this was originally a CSS Grid container
  const gridData = frame.getPluginData('cssGridLayout');
  if (gridData) {
    try {
      const gridInfo = JSON.parse(gridData);
      const gridResult = convertGridToNestedAutoLayout(frame, kids, gridInfo);
      if (gridResult) {
        console.log('Successfully converted CSS Grid to nested Auto Layout');
        return gridResult;
      }
    } catch (error) {
      console.warn('Failed to parse CSS Grid data:', error);
    }
  }

  // Use enhanced direction detection with confidence scoring
  const directionAnalysis = inferDirectionEnhanced(kids, frameBox);
  
  // Analyze if Auto Layout is suitable for this container
  const layoutDecision = analyzeLayoutCompatibility(frame, kids, frameBox, directionAnalysis);
  
  console.log(`Layout compatibility analysis: ${layoutDecision.useAutoLayout ? 'AUTO LAYOUT' : 'ABSOLUTE'} (confidence: ${layoutDecision.confidence.toFixed(2)}) - ${layoutDecision.reason}`);
  
  // If Auto Layout is not suitable, keep absolute positioning
  if (!layoutDecision.useAutoLayout) {
    console.log('Keeping absolute positioning due to layout complexity');
    // Store the analysis results for reference
    frame.setPluginData('layoutAnalysis', JSON.stringify({
      decision: 'absolute',
      confidence: layoutDecision.confidence,
      reason: layoutDecision.reason,
      factors: layoutDecision.factors
    }));
    return frame;
  }
  
  const direction = directionAnalysis.direction;
  console.log(`Applying Auto Layout: ${direction} (confidence: ${directionAnalysis.confidence.toFixed(2)}) - ${directionAnalysis.reason}`);
  
  const padding = computePadding(frame, kids);
  const spacing = computeItemSpacing(direction, kids);
  const { primary, counter } = inferAlignment(direction, frameBox, kids);

  const overlapping = new Set<SceneNode>();
  const sorted = kids.slice().sort(sortVisual);
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1];
    const b = sorted[i];
    const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (overlapX > POSITION_THRESHOLD && overlapY > POSITION_THRESHOLD) {
      overlapping.add(b.node);
    }
  }

  frame.layoutMode = direction;
  frame.itemSpacing = spacing;
  frame.paddingTop = padding.top;
  frame.paddingRight = padding.right;
  frame.paddingBottom = padding.bottom;
  frame.paddingLeft = padding.left;
  frame.primaryAxisAlignItems = primary;
  frame.counterAxisAlignItems = counter;

  // Store successful layout analysis
  frame.setPluginData('layoutAnalysis', JSON.stringify({
    decision: 'autolayout',
    direction: direction,
    confidence: layoutDecision.confidence,
    directionConfidence: directionAnalysis.confidence,
    reason: layoutDecision.reason,
    directionReason: directionAnalysis.reason,
    factors: layoutDecision.factors,
    metrics: directionAnalysis.metrics
  }));

  for (const kid of kids) {
    if ('layoutPositioning' in kid.node) {
      (kid.node as any).layoutPositioning = overlapping.has(kid.node) ? 'ABSOLUTE' : 'AUTO';
    }
    if (kid.node.type === 'TEXT') {
      const text = kid.node as TextNode;
      text.textAutoResize = 'NONE';
      text.resizeWithoutConstraints(kid.w, kid.h);
    } else if ('resizeWithoutConstraints' in kid.node) {
      try {
        (kid.node as any).resizeWithoutConstraints(kid.w, kid.h);
      } catch {
        // ignore if node doesn't support resize
      }
    }
  }
  return frame;
}

type LayoutValidationResult = {
  isValid: boolean;
  score: number; // 0-100
  issues: string[];
  suggestions: string[];
  metrics: {
    positionAccuracy: number;
    spacingConsistency: number;
    alignmentPreservation: number;
    overflowHandling: number;
  };
};

function validateAutoLayoutConversion(
  originalFrame: FrameNode,
  convertedFrame: FrameNode
): LayoutValidationResult {
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  // Measure position accuracy
  const positionAccuracy = measurePositionAccuracy(originalFrame, convertedFrame);
  if (positionAccuracy < 0.8) {
    issues.push('Element positions changed significantly after Auto Layout conversion');
    suggestions.push('Consider using absolute positioning for overlapping or complex layouts');
  }

  // Measure spacing consistency
  const spacingConsistency = measureSpacingConsistency(convertedFrame);
  if (spacingConsistency < 0.7) {
    issues.push('Spacing between elements is inconsistent');
    suggestions.push('Review itemSpacing and padding settings');
  }

  // Check alignment preservation
  const alignmentPreservation = measureAlignmentPreservation(originalFrame, convertedFrame);
  if (alignmentPreservation < 0.8) {
    issues.push('Element alignment changed after conversion');
    suggestions.push('Check primaryAxisAlignItems and counterAxisAlignItems settings');
  }

  // Check overflow handling
  const overflowHandling = measureOverflowHandling(convertedFrame);
  if (overflowHandling < 0.9) {
    issues.push('Some elements may be clipped or overflow the container');
    suggestions.push('Adjust padding or container size to accommodate all children');
  }

  const metrics = {
    positionAccuracy,
    spacingConsistency,
    alignmentPreservation,
    overflowHandling
  };

  const score = Math.round((
    positionAccuracy * 0.3 +
    spacingConsistency * 0.2 +
    alignmentPreservation * 0.3 +
    overflowHandling * 0.2
  ) * 100);

  return {
    isValid: score >= 70,
    score,
    issues,
    suggestions,
    metrics
  };
}

function measurePositionAccuracy(original: FrameNode, converted: FrameNode): number {
  const originalPositions = Array.from(original.children).map(child => ({
    x: child.x,
    y: child.y,
    name: child.name
  }));

  const convertedPositions = Array.from(converted.children).map(child => ({
    x: child.x,
    y: child.y,
    name: child.name
  }));

  let totalDeviation = 0;
  let comparisons = 0;

  originalPositions.forEach(orig => {
    const conv = convertedPositions.find(c => c.name === orig.name);
    if (conv) {
      const deviation = Math.sqrt(
        Math.pow(orig.x - conv.x, 2) + Math.pow(orig.y - conv.y, 2)
      );
      totalDeviation += deviation;
      comparisons++;
    }
  });

  if (comparisons === 0) return 1.0;

  // Normalize by average element size (assume 100px average)
  const avgDeviation = totalDeviation / comparisons;
  return Math.max(0, 1 - (avgDeviation / 100));
}

function measureSpacingConsistency(frame: FrameNode): number {
  if (frame.layoutMode === 'NONE' || frame.children.length < 2) return 1.0;

  const children = Array.from(frame.children) as SceneNode[];
  const gaps: number[] = [];

  // Calculate gaps between adjacent children
  for (let i = 1; i < children.length; i++) {
    const prev = children[i - 1];
    const curr = children[i];

    let gap: number;
    if (frame.layoutMode === 'HORIZONTAL') {
      gap = curr.x - (prev.x + prev.width);
    } else {
      gap = curr.y - (prev.y + prev.height);
    }
    gaps.push(gap);
  }

  if (gaps.length === 0) return 1.0;

  // Calculate variance in gaps
  const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  const variance = gaps.reduce((sum, gap) => sum + Math.pow(gap - avgGap, 2), 0) / gaps.length;
  const stdDev = Math.sqrt(variance);

  // Consistency is inverse of coefficient of variation
  const coefficientOfVariation = avgGap > 0 ? stdDev / avgGap : stdDev;
  return Math.max(0, 1 - coefficientOfVariation);
}

function measureAlignmentPreservation(original: FrameNode, converted: FrameNode): number {
  // Compare center positions of children to check alignment preservation
  const originalCenters = Array.from(original.children).map(child => ({
    cx: child.x + child.width / 2,
    cy: child.y + child.height / 2,
    name: child.name
  }));

  const convertedCenters = Array.from(converted.children).map(child => ({
    cx: child.x + child.width / 2,
    cy: child.y + child.height / 2,
    name: child.name
  }));

  let alignmentScore = 0;
  let comparisons = 0;

  originalCenters.forEach(orig => {
    const conv = convertedCenters.find(c => c.name === orig.name);
    if (conv) {
      // Check if relative alignment is preserved (within tolerance)
      const alignmentTolerance = 5; // pixels
      const deltaX = Math.abs(orig.cx - conv.cx);
      const deltaY = Math.abs(orig.cy - conv.cy);
      
      if (deltaX <= alignmentTolerance && deltaY <= alignmentTolerance) {
        alignmentScore += 1;
      }
      comparisons++;
    }
  });

  return comparisons > 0 ? alignmentScore / comparisons : 1.0;
}

function measureOverflowHandling(frame: FrameNode): number {
  const children = Array.from(frame.children) as SceneNode[];
  let withinBounds = 0;

  children.forEach(child => {
    const rightEdge = child.x + child.width;
    const bottomEdge = child.y + child.height;

    if (rightEdge <= frame.width && bottomEdge <= frame.height && child.x >= 0 && child.y >= 0) {
      withinBounds++;
    }
  });

  return children.length > 0 ? withinBounds / children.length : 1.0;
}

export function upgradeSelectionToAutoLayout() {
  const selection = figma.currentPage.selection;
  if (!selection.length) {
    figma.notify('Select at least one frame or group to upgrade');
    return;
  }

  let upgraded = 0;
  let validationResults: LayoutValidationResult[] = [];

  for (const node of selection) {
    if (node.type === 'FRAME' || node.type === 'GROUP') {
      // Store original state for validation
      const originalFrame = node.clone() as FrameNode;
      
      const convertedFrame = upgradeToAutoLayout(node as FrameNode | GroupNode);
      if (convertedFrame) {
        // Validate the conversion
        const validation = validateAutoLayoutConversion(originalFrame, convertedFrame);
        validationResults.push(validation);
        
        // Store validation results
        convertedFrame.setPluginData('layoutValidation', JSON.stringify(validation));
        
        upgraded++;
      }
      
      // Clean up temporary clone
      originalFrame.remove();
    }
  }

  if (upgraded) {
    const avgScore = validationResults.reduce((sum, result) => sum + result.score, 0) / validationResults.length;
    const issuesCount = validationResults.reduce((sum, result) => sum + result.issues.length, 0);
    
    if (avgScore >= 80) {
      figma.notify(`✅ Upgraded ${upgraded} selection${upgraded > 1 ? 's' : ''} with ${avgScore.toFixed(0)}% accuracy`);
    } else if (avgScore >= 60) {
      figma.notify(`⚠️ Upgraded ${upgraded} selection${upgraded > 1 ? 's' : ''} with ${avgScore.toFixed(0)}% accuracy (${issuesCount} issues found)`);
    } else {
      figma.notify(`❌ Upgraded ${upgraded} selection${upgraded > 1 ? 's' : ''} with ${avgScore.toFixed(0)}% accuracy (review recommended)`);
    }
  } else {
    figma.notify('No compatible frames/groups selected');
  }
}

export function validateSelectedAutoLayouts() {
  const selection = figma.currentPage.selection;
  if (!selection.length) {
    figma.notify('Select Auto Layout frames to validate');
    return;
  }

  let validated = 0;
  let totalScore = 0;

  for (const node of selection) {
    if (node.type === 'FRAME' && (node as FrameNode).layoutMode !== 'NONE') {
      const validationData = node.getPluginData('layoutValidation');
      if (validationData) {
        try {
          const validation = JSON.parse(validationData) as LayoutValidationResult;
          console.log(`Validation for "${node.name}": ${validation.score}% - ${validation.issues.length} issues`);
          totalScore += validation.score;
          validated++;
        } catch (error) {
          console.warn('Failed to parse validation data for', node.name);
        }
      }
    }
  }

  if (validated) {
    const avgScore = totalScore / validated;
    figma.notify(`Validated ${validated} Auto Layout${validated > 1 ? 's' : ''}: ${avgScore.toFixed(0)}% average quality`);
  } else {
    figma.notify('No validated Auto Layouts found in selection');
  }
}
