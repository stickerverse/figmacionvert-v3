#!/usr/bin/env node

/**
 * Manual Test Helper for Extension Capture
 * 
 * Since automated Puppeteer setup is having issues, this script:
 * 1. Creates a test trigger URL 
 * 2. Provides instructions for manual testing
 * 3. Monitors the handoff server for capture results
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const HANDOFF_SERVER = 'http://localhost:4411';
const TEST_URL = 'https://www.youtube.com/watch?v=BDFnfmyubUY&list=EL4qhDj5SIwssftAiVUyKMaA&index=8';
const ARTIFACTS_DIR = path.join(__dirname, 'test-output/manual-test');

// Ensure artifacts directory exists
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

class ManualTestMonitor {
  constructor() {
    this.startTime = Date.now();
    this.captures = [];
    this.polling = false;
  }

  async checkServerHealth() {
    console.log('🔍 Checking handoff server health...');
    
    try {
      const response = await this.makeRequest('GET', '/health');
      console.log('✅ Handoff server is healthy');
      console.log(`📊 Queue length: ${response.queueLength}`);
      return true;
    } catch (error) {
      console.error('❌ Handoff server not responding:', error.message);
      return false;
    }
  }

  async pollForCaptures() {
    if (this.polling) return;
    this.polling = true;

    console.log('👂 Polling for capture jobs...');
    
    while (this.polling) {
      try {
        // Check for completed jobs
        const jobs = await this.makeRequest('GET', '/api/jobs/completed');
        
        if (jobs && jobs.length > 0) {
          for (const job of jobs) {
            if (!this.captures.find(c => c.id === job.id)) {
              this.captures.push(job);
              console.log(`📦 New capture detected: ${job.id}`);
              await this.saveCapture(job);
            }
          }
        }

        // Check for active jobs
        const activeJobs = await this.makeRequest('GET', '/api/jobs/active');
        if (activeJobs && activeJobs.length > 0) {
          console.log(`⏳ ${activeJobs.length} active job(s)...`);
        }

      } catch (error) {
        console.warn('⚠️ Polling error:', error.message);
      }

      await this.sleep(2000); // Poll every 2 seconds
    }
  }

  async saveCapture(job) {
    try {
      const filename = `capture-${job.id}-${Date.now()}.json`;
      const filepath = path.join(ARTIFACTS_DIR, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(job, null, 2));
      console.log(`✅ Capture saved: ${filename}`);
      
      // Analyze the capture
      await this.analyzeCapture(job);
      
    } catch (error) {
      console.error('❌ Failed to save capture:', error);
    }
  }

  async analyzeCapture(job) {
    console.log('\n🔍 Analyzing capture data...');
    
    const analysis = {
      jobId: job.id,
      timestamp: job.timestamp,
      url: job.payload?.metadata?.url,
      viewport: job.payload?.metadata?.viewport,
      nodeCount: 0,
      fillCount: 0,
      strokeCount: 0,
      textNodes: 0,
      imageNodes: 0,
      invalidFills: 0,
      invalidPositions: 0,
      issues: []
    };

    try {
      if (job.payload?.root) {
        this.analyzeTree(job.payload.tree, analysis);
      }
      
      // Log analysis results
      console.log('📊 Analysis Results:');
      console.log(`   Nodes: ${analysis.nodeCount}`);
      console.log(`   Fills: ${analysis.fillCount} (${analysis.invalidFills} invalid)`);
      console.log(`   Text Nodes: ${analysis.textNodes}`);
      console.log(`   Image Nodes: ${analysis.imageNodes}`);
      console.log(`   Position Issues: ${analysis.invalidPositions}`);
      
      if (analysis.issues.length > 0) {
        console.log('⚠️ Issues Found:');
        analysis.issues.forEach((issue, i) => {
          console.log(`   ${i + 1}. ${issue}`);
        });
      }
      
      // Save analysis
      const analysisFile = path.join(ARTIFACTS_DIR, `analysis-${job.id}.json`);
      fs.writeFileSync(analysisFile, JSON.stringify(analysis, null, 2));
      
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      analysis.issues.push(`Analysis failed: ${error.message}`);
    }

    return analysis;
  }

  analyzeTree(node, analysis) {
    analysis.nodeCount++;
    
    // Check fills
    if (node.fills && Array.isArray(node.fills)) {
      analysis.fillCount += node.fills.length;
      
      node.fills.forEach(fill => {
        if (fill.themeEnforcement !== undefined) {
          analysis.invalidFills++;
        }
      });
    }
    
    // Check positioning
    if (node.layout) {
      const { x, y, width, height } = node.layout;
      if (typeof x !== 'number' || typeof y !== 'number' || 
          typeof width !== 'number' || typeof height !== 'number' ||
          !isFinite(x) || !isFinite(y) || !isFinite(width) || !isFinite(height) ||
          width <= 0 || height <= 0) {
        analysis.invalidPositions++;
      }
    }
    
    // Count node types
    if (node.type === 'TEXT') analysis.textNodes++;
    if (node.type === 'IMAGE') analysis.imageNodes++;
    
    // Recurse
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(child => this.analyzeTree(child, analysis));
    }
  }

  async makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, HANDOFF_SERVER);
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = http.request(url, options, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            resolve(parsed);
          } catch (error) {
            resolve(responseData);
          }
        });
      });

      req.on('error', reject);
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stop() {
    this.polling = false;
  }
}

async function main() {
  console.log('🧪 Manual Extension Test Monitor');
  console.log('================================\n');
  
  const monitor = new ManualTestMonitor();
  
  // Check server health first
  const serverHealthy = await monitor.checkServerHealth();
  if (!serverHealthy) {
    console.log('\n❌ Please start the handoff server first:');
    console.log('   ./start.sh');
    process.exit(1);
  }
  
  console.log('\n📋 Manual Test Instructions:');
  console.log('1. Load the Chrome extension from: chrome-extension/dist');
  console.log(`2. Navigate to: ${TEST_URL}`);
  console.log('3. Wait for the page to load completely');
  console.log('4. Open browser console (F12)');
  console.log('5. Execute this test trigger:');
  console.log('   window.postMessage({type: "START_CAPTURE_TEST", viewports: [{name: "Natural", preserveNatural: true}]}, "*")');
  console.log('6. Watch for capture completion in console and this monitor\n');
  
  // Start monitoring
  monitor.pollForCaptures();
  
  console.log('👂 Monitoring for captures... (Press Ctrl+C to stop)');
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping monitor...');
    monitor.stop();
    
    if (monitor.captures.length > 0) {
      console.log(`✅ Captured ${monitor.captures.length} job(s)`);
      console.log(`📁 Artifacts saved to: ${ARTIFACTS_DIR}`);
    } else {
      console.log('❌ No captures detected');
    }
    
    process.exit(0);
  });
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Monitor failed:', error);
    process.exit(1);
  });
}

module.exports = { ManualTestMonitor };