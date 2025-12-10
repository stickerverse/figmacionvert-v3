/**
 * Puppeteer Auto-Import - CLI wrapper for headless capture
 * 
 * This is a THIN WRAPPER that calls the canonical /api/capture endpoint.
 * All capture logic is in handoff-server.js runHeadlessCapture().
 * 
 * Usage: node puppeteer-auto-import.js <url>
 */

const targetUrl = process.argv[2] || 'https://stripe.com';
const HANDOFF_SERVER = process.env.HANDOFF_SERVER || 'http://127.0.0.1:4411';

async function captureViaAPI(url) {
  console.log('🚀 Puppeteer Auto-Import (via API)');
  console.log('===================================');
  console.log(`📍 Target URL: ${url}`);
  console.log(`📡 Server: ${HANDOFF_SERVER}`);
  console.log('');
  
  try {
    console.log('📸 Calling /api/capture...');
    const response = await fetch(`${HANDOFF_SERVER}/api/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.ok) {
      throw new Error(result.error || 'Capture failed');
    }
    
    // Log capture stats
    const data = result.data || {};
    console.log('');
    console.log('✅ Capture Complete!');
    console.log('====================');
    console.log(`🎯 Tree nodes: ${countNodes(data.tree)}`);
    console.log(`🎨 Assets: ${Object.keys(data.assets?.images || {}).length} images`);
    console.log(`🔤 Fonts: ${(data.capturedFonts || []).length} captured`);
    console.log(`♿ Accessibility: ${data.accessibility ? 'extracted' : 'not available'}`);
    console.log(`📊 CSS Coverage: ${data.cssCoverage?.coveragePercent || 'N/A'}%`);
    console.log(`🎯 Hover States: ${(data.hoverStates || []).length} variants`);
    console.log('');
    
    // Queue for Figma import
    console.log('🚀 Queuing for Figma import...');
    const queueResponse = await fetch(`${HANDOFF_SERVER}/api/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: url,
        schema: data,
        timestamp: new Date().toISOString(),
        source: 'puppeteer-cli'
      })
    });
    
    const queueResult = await queueResponse.json();
    if (queueResult.ok) {
      console.log(`✅ Queued successfully (ID: ${queueResult.id})`);
    } else {
      console.warn('⚠️ Queue failed:', queueResult.error);
    }
    
    return result;
  } catch (error) {
    console.error('');
    console.error('❌ Capture Failed');
    console.error('=================');
    console.error(error.message);
    console.error('');
    console.error('Make sure handoff-server is running: node handoff-server.js');
    process.exit(1);
  }
}

function countNodes(node) {
  if (!node) return 0;
  let count = 1;
  for (const child of node.children || []) {
    count += countNodes(child);
  }
  return count;
}

captureViaAPI(targetUrl)
  .then(() => {
    console.log('🎉 Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 Error:', err);
    process.exit(1);
  });