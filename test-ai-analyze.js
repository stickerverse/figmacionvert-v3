const fetch = require('node-fetch');

async function testAiAnalyze() {
  const pixel = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  const url = "http://localhost:4411/api/ai-analyze";

  console.log("Sending valid 1x1 pixel image to " + url);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        screenshot: pixel, // No "data:image..." prefix needed as per code (it handles it, but handles raw base64 too)
        metadata: { strictFidelity: false } // Attempt full analysis
      })
    });

    const json = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", JSON.stringify(json, null, 2));
  } catch (e) {
    console.error("Fetch failed:", e);
  }
}

testAiAnalyze();
