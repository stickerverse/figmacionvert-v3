import { HighFidelityCapture, LayoutNode } from '../high-fidelity-capture';

// Add support for capturing more style properties
const CAPTURE_OPTIONS = {
  captureBoxShadow: true,
  captureTextShadow: true,
  captureTransforms: true,
  capturePseudoElements: true,
  captureComputedStyles: true
};

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'CAPTURE_PAGE') {
    capturePage(request.options || {})
      .then(result => {
        sendResponse({ success: true, data: result });
      })
      .catch(error => {
        console.error('Capture error:', error);
        sendResponse({ 
          success: false, 
          error: error.message || 'Failed to capture page' 
        });
      });
    
    // Return true to indicate we'll send a response asynchronously
    return true;
  }
});

async function capturePage(options = {}): Promise<LayoutNode> {
  console.log('Starting advanced page capture...');
  
  try {
    // Wait for the page to be fully loaded
    await waitForPageLoad();
    
    // Merge default options with provided options
    const captureOptions = { ...CAPTURE_OPTIONS, ...options };
    
    // Capture the page structure with the specified options
    const rootNode = await HighFidelityCapture.capturePage(captureOptions);
    
    if (!rootNode) {
      throw new Error('Failed to capture page: No root node returned');
    }
    
    console.log('Advanced page capture complete', {
      nodeCount: countNodes(rootNode),
      width: rootNode.style.width,
      height: rootNode.style.height
    });
    
    return rootNode;
  } catch (error) {
    console.error('Error during advanced page capture:', error);
    throw error;
  }
}

// Helper function to wait for page to be fully loaded
function waitForPageLoad(): Promise<void> {
  return new Promise((resolve) => {
    if (document.readyState === 'complete') {
      resolve();
    } else {
      window.addEventListener('load', () => resolve(), { once: true });
    }
  });
}

// Helper function to count nodes in the tree
function countNodes(node: LayoutNode): number {
  let count = 1; // Count this node
  if (node.children) {
    for (const child of node.children) {
      count += countNodes(child);
    }
  }
  return count;
}

// Export for testing
export { capturePage };
