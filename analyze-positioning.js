const fs = require('fs');
const schema = JSON.parse(fs.readFileSync('page-capture-1766449560210.json', 'utf8'));
const treeRoot = schema.captures[0].data.tree;

console.log('=== POSITIONING ANALYSIS ===\n');

// Analyze root and first few layers
function analyzeNode(node, depth = 0, maxDepth = 2) {
    if (!node || depth > maxDepth) return;
    
    const indent = '  '.repeat(depth);
    const layout = node.absoluteLayout || node.layout;
    const pos = layout ? `(${Math.round(layout.left || layout.x || 0)}, ${Math.round(layout.top || layout.y || 0)})` : 'NO LAYOUT';
    const size = layout ? `${Math.round(layout.width || 0)}x${Math.round(layout.height || 0)}` : '';
    const zIndex = node.zIndex || node.layoutContext?.zIndex || 'auto';
    const position = node.layoutContext?.position || node.positioning?.type || '?';
    
    console.log(`${indent}${node.name || node.type} [${node.type}] ${pos} ${size} z:${zIndex} pos:${position}`);
    
    if (node.children && depth < maxDepth) {
        node.children.slice(0, 5).forEach(child => analyzeNode(child, depth + 1, maxDepth));
        if (node.children.length > 5) {
            console.log(`${indent}  ... +${node.children.length - 5} more`);
        }
    }
}

analyzeNode(treeRoot);

// Check for overlapping elements at root level
console.log('\n=== ROOT LEVEL OVERLAP ANALYSIS ===\n');
if (treeRoot.children) {
    treeRoot.children.forEach((child, i) => {
        const layout = child.absoluteLayout || child.layout;
        if (layout) {
            const bounds = {
                left: layout.left || layout.x || 0,
                top: layout.top || layout.y || 0,
                right: (layout.left || layout.x || 0) + (layout.width || 0),
                bottom: (layout.top || layout.y || 0) + (layout.height || 0)
            };
            console.log(`${i}. ${child.name} @ (${Math.round(bounds.left)},${Math.round(bounds.top)}) → (${Math.round(bounds.right)},${Math.round(bounds.bottom)})`);
        }
    });
}
