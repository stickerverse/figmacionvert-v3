import fs from 'fs';

const schemaPath = process.argv[2] || 'schema.json';

if (!fs.existsSync(schemaPath)) {
    console.error(`❌ File not found: ${schemaPath}`);
    process.exit(1);
}

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

console.log(`📂 Reading ${schemaPath}...`);

// Basic Metadata
console.log('--- Metadata ---');
console.log(`URL: ${schema.metadata?.url || 'N/A'}`);
const viewport = schema.metadata?.viewport || schema.viewport;
console.log(`Viewport: ${JSON.stringify(viewport)}`);
console.log(`Title: ${schema.metadata?.title || 'N/A'}`);

if (schema.errors && schema.errors.length > 0) {
    console.log('--- Errors ---');
    schema.errors.slice(0, 5).forEach(e => console.log(`[${e.phase}] ${e.message}`));
    if (schema.errors.length > 5) console.log(`... and ${schema.errors.length - 5} more errors`);
}

if (schema.metadata?.extractionErrors) {
    console.log('--- Extraction Errors (Metadata) ---');
    const errors = schema.metadata.extractionErrors;
    if (Array.isArray(errors)) {
        errors.slice(0, 5).forEach(e => console.log(`[${e.phase || 'unknown'}] ${e.message}`));
        if (errors.length > 5) console.log(`... and ${errors.length - 5} more errors`);
    } else {
        console.log(JSON.stringify(errors, null, 2));
    }
}

// Tree Statistics
const nodes = [];
function collectNodes(node) {
    if (!node) return;
    nodes.push(node);
    if (node.children) {
        node.children.forEach(collectNodes);
    }
}

// Handle wrapped format: { jobId, metadata, schema: { root/tree } }
// and check 'root' (canonical) before 'tree' (legacy)
const actualSchema = schema.schema || schema;
const treeRoot = actualSchema.root || actualSchema.tree || 
                 schema.captures?.[0]?.data?.root || 
                 schema.captures?.[0]?.data?.tree;
collectNodes(treeRoot);

const textNodes = nodes.filter(n => n.characters && n.characters.length > 0);
const imageFills = nodes.flatMap(n => n.fills || []).filter(f => f.type === 'IMAGE');
const fillsCount = nodes.filter(n => n.fills && n.fills.length > 0).length;
const transparentCount = nodes.length - fillsCount;

console.log('--- Statistics ---');
console.log('Total Nodes:', nodes.length);
console.log('Text Nodes:', textNodes.length);
console.log('Image Fills:', imageFills.length);
console.log('Nodes with Fills:', fillsCount);
console.log('Nodes without Fills:', transparentCount);

if (schema.metadata?.extractionSummary) {
    console.log('--- Extraction Summary ---');
    console.log(JSON.stringify(schema.metadata.extractionSummary, null, 2));
}

if (schema.metadata?.diagnostics) {
    console.log('--- Diagnostics ---');
    console.log(JSON.stringify(schema.metadata.diagnostics, null, 2));
}

function printTree(node, depth = 0, maxDepth = 3) {
    if (!node || depth > maxDepth) return;
    
    const indent = '  '.repeat(depth);
    const childCount = node.children ? node.children.length : 0;
    const pos = node.absoluteLayout ? `at [${Math.round(node.absoluteLayout.left)}, ${Math.round(node.absoluteLayout.top)}]` : '';
    const size = node.absoluteLayout ? `size ${Math.round(node.absoluteLayout.width)}x${Math.round(node.absoluteLayout.height)}` : '';
    
    console.log(`${indent}- ${node.name || node.type} (${node.type}) ${pos} ${size}`);
    if (childCount > 0) {
        if (depth < maxDepth) {
            node.children.forEach(child => printTree(child, depth + 1, maxDepth));
        } else {
            console.log(`${indent}  └─ ... ${childCount} children`);
        }
    }
}

console.log('--- Root Tree (3 levels) ---');
if (treeRoot && treeRoot.children) {
    treeRoot.children.forEach(child => printTree(child, 0, 3));
} else if (treeRoot) {
    printTree(treeRoot, 0, 3);
}
