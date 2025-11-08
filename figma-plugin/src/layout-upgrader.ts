type XYWH = { x: number; y: number; width: number; height: number };
type ChildBox = { node: SceneNode; x: number; y: number; w: number; h: number };

const POSITION_THRESHOLD = 0.5;

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

function inferDirection(children: ChildBox[]): 'HORIZONTAL' | 'VERTICAL' {
  if (children.length <= 1) return 'HORIZONTAL';
  const hGaps: number[] = [];
  const vGaps: number[] = [];
  for (let i = 1; i < children.length; i++) {
    const prev = children[i - 1];
    const cur = children[i];
    const hGap = cur.x - (prev.x + prev.w);
    const vGap = cur.y - (prev.y + prev.h);
    if (hGap > -POSITION_THRESHOLD) hGaps.push(hGap);
    if (vGap > -POSITION_THRESHOLD) vGaps.push(vGap);
  }
  return median(hGaps) >= median(vGaps) ? 'HORIZONTAL' : 'VERTICAL';
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
  const primary: AutolayoutPrimaryAxisAlignItems =
    gaps.length >= 2 && variance > gMed * 0.5 ? 'SPACE_BETWEEN' : 'MIN';

  const cCenterX = container.x + container.width / 2;
  const cCenterY = container.y + container.height / 2;
  const centers = kids.map((k) => ({ cx: k.x + k.w / 2, cy: k.y + k.h / 2 }));
  const avgCx = centers.reduce((s, v) => s + v.cx, 0) / centers.length;
  const avgCy = centers.reduce((s, v) => s + v.cy, 0) / centers.length;

  let counter: Alignment = 'MIN';
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

  const direction = inferDirection(kids);
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

export function upgradeSelectionToAutoLayout() {
  const selection = figma.currentPage.selection;
  if (!selection.length) {
    figma.notify('Select at least one frame or group to upgrade');
    return;
  }

  let upgraded = 0;
  for (const node of selection) {
    if (node.type === 'FRAME' || node.type === 'GROUP') {
      upgradeToAutoLayout(node as FrameNode | GroupNode);
      upgraded++;
    }
  }

  if (upgraded) {
    figma.notify(`Upgraded ${upgraded} selection${upgraded > 1 ? 's' : ''} to Auto Layout`);
  } else {
    figma.notify('No compatible frames/groups selected');
  }
}
