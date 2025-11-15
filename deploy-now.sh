#!/bin/bash

echo "🚀 DEPLOYING YOUR CLOUD SERVICE NOW..."
echo "======================================"

cd capture-service

# Step 1: Login to Railway (opens browser)
echo "🔐 Step 1: Railway Authentication"
echo "A browser window will open for Railway login..."
railway login

# Step 2: Create and link project
echo "🏗️ Step 2: Creating Railway project..."
railway init --name figmaconvert-capture

# Step 3: Add Redis database
echo "🗄️ Step 3: Adding Redis database..."  
railway add redis

# Step 4: Set all environment variables
echo "🔧 Step 4: Setting environment variables..."

railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set AWS_REGION=us-east-1
railway variables set S3_BUCKET=figma-capture-assets
railway variables set S3_ASSET_EXPIRY_HOURS=24
railway variables set API_KEY_REQUIRED=true
railway variables set AWS_ACCESS_KEY_ID=AKIAXWHDLVBQDPJUFL66
railway variables set AWS_SECRET_ACCESS_KEY=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
railway variables set ALLOWED_API_KEYS=f7df13dd6f622998e79f8ec581cc2f4dc908331cadb426b74ac4b8879d186da2
railway variables set RATE_LIMIT_WINDOW_MS=900000
railway variables set RATE_LIMIT_MAX_REQUESTS=100
railway variables set WORKER_CONCURRENCY=2
railway variables set CAPTURE_TIMEOUT_MS=90000
railway variables set BROWSER_HEADLESS=true
railway variables set BROWSER_ARGS="--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage"
railway variables set JOB_RETENTION_DAYS=7
railway variables set JOB_MAX_ATTEMPTS=3
railway variables set LOG_LEVEL=info
railway variables set LOG_PRETTY=false

# Step 5: Deploy!
echo "🚀 Step 5: Deploying to Railway..."
railway up --detach

# Step 6: Get URL and status
echo "⏳ Waiting for deployment to complete..."
sleep 30

DEPLOY_URL=$(railway status --json | jq -r '.deployments[0].url // empty')

if [ -z "$DEPLOY_URL" ]; then
    echo "🔍 Getting service URL..."
    DEPLOY_URL=$(railway domain)
fi

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo "======================="
echo "🌐 Service URL: $DEPLOY_URL"
echo "🔑 API Key: f7df13dd6f622998e79f8ec581cc2f4dc908331cadb426b74ac4b8879d186da2"
echo ""

# Step 7: Test deployment
echo "🧪 Testing deployment..."
if [ ! -z "$DEPLOY_URL" ]; then
    curl -s "$DEPLOY_URL/health" && echo "" || echo "❌ Health check failed"
else
    echo "⚠️ Could not get deployment URL - check Railway dashboard"
fi

# Step 8: Update Figma plugin
cd ../figma-plugin
if [ ! -z "$DEPLOY_URL" ]; then
    echo "🔧 Updating Figma plugin with service URL..."
    
    # Update the plugin configuration
    sed -i.bak "s|const CAPTURE_SERVICE_URL = '';|const CAPTURE_SERVICE_URL = '$DEPLOY_URL';|g" src/code.ts
    sed -i.bak "s|const CAPTURE_SERVICE_API_KEY = '';|const CAPTURE_SERVICE_API_KEY = 'f7df13dd6f622998e79f8ec581cc2f4dc908331cadb426b74ac4b8879d186da2';|g" src/code.ts
    
    # Rebuild plugin
    echo "🔨 Rebuilding Figma plugin..."
    npm run build
    
    echo ""
    echo "🎉 EVERYTHING IS READY!"
    echo "====================="
    echo "✅ Cloud service: $DEPLOY_URL"
    echo "✅ Figma plugin: Updated and rebuilt"
    echo "✅ Chrome extension: Ready to use"
    echo ""
    echo "🔗 Load the updated plugin in Figma Desktop to test!"
fi

echo ""
echo "🎯 Next Steps:"
echo "1. Load plugin in Figma Desktop"
echo "2. Plugin should show green LED (connected to cloud)"
echo "3. Use Chrome extension to capture pages"
echo "4. Watch auto-import in Figma!"