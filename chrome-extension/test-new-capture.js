// Test a fresh capture to see what happens
const puppeteer = require('puppeteer');

(async () => {
  console.log('Starting fresh capture test...');
  
  try {
    // Test with a simple page first
    const response = await fetch('http://localhost:4411/api/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://example.com',
        options: { timeout: 30000 }
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('Capture initiated:', result);
    } else {
      console.log('Capture failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
