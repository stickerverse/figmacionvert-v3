#!/bin/bash

echo "🚀 Automated Railway Deployment Script"
echo "======================================"

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "Installing Railway CLI..."
    npm install -g @railway/cli
fi

# Navigate to capture service directory
cd capture-service

echo "📋 Setting up Railway project..."

# Initialize Railway project
railway login --browser
railway init

# Set environment variables
echo "🔧 Setting environment variables..."

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

# Add Redis database
echo "🗄️ Adding Redis database..."
railway add --database redis

# Deploy the service
echo "🚀 Deploying to Railway..."
railway up

# Get the deployment URL
echo "🌐 Getting deployment URL..."
RAILWAY_URL=$(railway status --json | jq -r '.deployments[0].url')

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo "======================="
echo "🌐 Service URL: $RAILWAY_URL"
echo "🔑 API Key: f7df13dd6f622998e79f8ec581cc2f4dc908331cadb426b74ac4b8879d186da2"
echo ""
echo "🧪 Test your deployment:"
echo "curl $RAILWAY_URL/health"
echo ""
echo "📝 Next step: Update your Figma plugin with this URL"

# Update Figma plugin automatically
cd ../figma-plugin
echo "🔧 Updating Figma plugin configuration..."

# Update the URL in the plugin code
sed -i.bak "s|const CAPTURE_SERVICE_URL = '';|const CAPTURE_SERVICE_URL = '$RAILWAY_URL';|g" src/code.ts
sed -i.bak "s|const CAPTURE_SERVICE_API_KEY = '';|const CAPTURE_SERVICE_API_KEY = 'f7df13dd6f622998e79f8ec581cc2f4dc908331cadb426b74ac4b8879d186da2';|g" src/code.ts

# Rebuild the plugin
echo "🔨 Rebuilding Figma plugin..."
npm run build

echo ""
echo "🎉 EVERYTHING IS READY!"
echo "====================="
echo "✅ Cloud service deployed: $RAILWAY_URL"
echo "✅ Figma plugin updated and built"
echo "✅ Chrome extension ready (already configured)"
echo ""
echo "🔗 Load the updated plugin in Figma Desktop to test!"