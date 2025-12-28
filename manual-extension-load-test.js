#!/usr/bin/env node

/**
 * Manual Extension Load Test
 * 
 * This creates a simple test page that tells the user to manually load the extension
 * and test the capture workflow, then monitors for results.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const TEST_URL = "https://www.youtube.com/watch?v=LrC9IGf1Qm0&list=RDLrC9IGf1Qm0&start_radio=1";
const EXT_PATH = "/Users/skirk92/figmacionvert-2/chrome-extension/dist";

const testPage = `
<!DOCTYPE html>
<html>
<head>
    <title>Extension Manual Test</title>
    <style>
        body { font-family: system-ui; max-width: 800px; margin: 50px auto; padding: 20px; }
        .step { background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .code { background: #000; color: #0f0; padding: 10px; border-radius: 4px; font-family: monospace; }
        button { background: #007bff; color: white; border: none; padding: 12px 24px; border-radius: 4px; cursor: pointer; }
        .status { padding: 10px; margin: 10px 0; border-radius: 4px; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
        .info { background: #d1ecf1; border: 1px solid #b6d4db; color: #0c5460; }
    </style>
</head>
<body>
    <h1>🔧 Manual Extension Test</h1>
    
    <div class="step">
        <h2>Step 1: Load Extension</h2>
        <p>1. Open <strong>chrome://extensions/</strong> in a new tab</p>
        <p>2. Enable "Developer mode" (toggle in top-right)</p>
        <p>3. Click "Load unpacked"</p>
        <p>4. Select this directory: <code>${EXT_PATH}</code></p>
        <p>5. Verify the extension appears and is enabled</p>
        <div class="status info">
            Extension should be named "HTML2DESIGN" and show as enabled
        </div>
    </div>

    <div class="step">
        <h2>Step 2: Test Content Script Injection</h2>
        <p>1. Navigate to: <a href="${TEST_URL}" target="_blank">${TEST_URL}</a></p>
        <p>2. Open DevTools (F12) and go to Console tab</p>
        <p>3. Look for these logs:</p>
        <div class="code">
🚀🚀🚀 CONTENT SCRIPT LOADED AT ...
🌐 Content script loaded
        </div>
        <div id="contentScriptStatus" class="status info">
            If you see these logs, content script is working ✅<br>
            If not, there's a fundamental loading issue ❌
        </div>
    </div>

    <div class="step">
        <h2>Step 3: Test Manual Trigger</h2>
        <p>In the YouTube page console, run:</p>
        <div class="code">
window.postMessage({
    type: "START_CAPTURE_TEST",
    viewports: [{name: "Natural", preserveNatural: true}],
    source: "manual-test"
}, "*");
        </div>
        <button onclick="copyToClipboard()">Copy Command</button>
        <div class="status info">
            Look for: <code>📨 [CONTENT SCRIPT] Received message: START_CAPTURE_TEST</code>
        </div>
    </div>

    <div class="step">
        <h2>Step 4: Test Extension Popup</h2>
        <p>1. Click the extension icon in the Chrome toolbar</p>
        <p>2. Try clicking "Capture & Send to Figma"</p>
        <div class="status info">
            This tests if the extension UI and background script are working
        </div>
    </div>

    <div class="step">
        <h2>Expected Results</h2>
        <div id="results">
            <div class="status info">
                <strong>✅ Working Extension:</strong><br>
                • Extension visible in chrome://extensions<br>
                • Content script logs appear on any webpage<br>
                • START_CAPTURE_TEST message triggers response<br>
                • Extension popup works<br>
                • Capture process starts (progress overlay appears)
            </div>
            
            <div class="status error">
                <strong>❌ Broken Extension:</strong><br>
                • Extension not visible or disabled in chrome://extensions<br>
                • No content script logs on webpages<br>
                • START_CAPTURE_TEST message ignored<br>
                • Extension popup doesn't work<br>
                • No capture activity
            </div>
        </div>
    </div>

    <div class="step">
        <h2>Report Results</h2>
        <textarea id="testResults" placeholder="Paste your findings here..." style="width: 100%; height: 150px;"></textarea>
        <br>
        <button onclick="saveResults()">Save Test Results</button>
        <div id="saveStatus"></div>
    </div>

    <script>
        function copyToClipboard() {
            const command = \`window.postMessage({
    type: "START_CAPTURE_TEST",
    viewports: [{name: "Natural", preserveNatural: true}],
    source: "manual-test"
}, "*");\`;
            navigator.clipboard.writeText(command);
            alert("Command copied to clipboard!");
        }

        function saveResults() {
            const results = document.getElementById('testResults').value;
            if (!results.trim()) {
                alert("Please enter your test results first");
                return;
            }

            fetch('/save-results', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    results: results,
                    timestamp: new Date().toISOString()
                })
            })
            .then(response => response.json())
            .then(data => {
                document.getElementById('saveStatus').innerHTML = 
                    '<div class="status success">Results saved! Check the terminal for output.</div>';
            })
            .catch(error => {
                document.getElementById('saveStatus').innerHTML = 
                    '<div class="status error">Save failed: ' + error.message + '</div>';
            });
        }
    </script>
</body>
</html>
`;

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(testPage);
  } else if (req.method === 'POST' && req.url === '/save-results') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('\n📋 MANUAL TEST RESULTS:');
        console.log('═'.repeat(80));
        console.log(data.results);
        console.log('═'.repeat(80));
        console.log(`Timestamp: ${data.timestamp}\n`);
        
        // Save to file
        const outputDir = path.join(__dirname, 'test-output', 'manual-results');
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const filename = `manual-test-${Date.now()}.txt`;
        const filepath = path.join(outputDir, filename);
        fs.writeFileSync(filepath, `Manual Test Results\n${'='.repeat(50)}\nTimestamp: ${data.timestamp}\n\n${data.results}\n`);
        
        console.log(`✅ Results saved to: ${filepath}`);
        
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({success: true}));
      } catch (error) {
        res.writeHead(400, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({error: error.message}));
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log('🧪 Manual Extension Test Server');
  console.log('═'.repeat(50));
  console.log(`📍 Test Page: http://localhost:${PORT}`);
  console.log(`📁 Extension Path: ${EXT_PATH}`);
  console.log(`🎯 Test URL: ${TEST_URL}`);
  console.log('\n📋 Instructions:');
  console.log('1. Open the test page in your browser');
  console.log('2. Follow the step-by-step instructions');
  console.log('3. Report your findings back');
  console.log('\nPress Ctrl+C to stop the server\n');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down test server...');
  server.close();
  process.exit(0);
});

module.exports = { server };