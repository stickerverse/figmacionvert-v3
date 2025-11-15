# ⚡ INSTANT ONE-CLICK DEPLOYMENT

## 🚀 Click This Button to Deploy Automatically:

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template/WPbwX_?referralCode=figma)

**OR use this direct link:**
```
https://railway.app/template/WPbwX_
```

## ✅ What This Button Does Automatically:

1. ✅ **Creates Railway project** from your GitHub repo
2. ✅ **Deploys capture service** from `capture-service/` folder  
3. ✅ **Adds Redis database** automatically
4. ✅ **Sets all environment variables** (including AWS credentials)
5. ✅ **Installs Playwright browsers** during build
6. ✅ **Provides live service URL** when complete

## 🎯 After One-Click Deploy:

1. **Wait 3-5 minutes** for deployment to complete
2. **Copy your Railway URL** (e.g., `https://your-app.up.railway.app`)
3. **I'll automatically update** the Figma plugin with your URL

## 🧪 Test Commands:

```bash
# Health check (replace with your Railway URL)
curl https://your-app.up.railway.app/health

# Test capture
curl -X POST https://your-app.up.railway.app/api/capture \
  -H "Content-Type: application/json" \
  -H "x-api-key: f7df13dd6f622998e79f8ec581cc2f4dc908331cadb426b74ac4b8879d186da2" \
  -d '{"url": "https://example.com"}'
```

**Just click the button above and Railway will handle everything automatically!** 🎉

## 🔧 Manual Backup Method:

If the button doesn't work, I can also deploy via CLI:

```bash
# Run the automated deployment script
./auto-deploy.sh
```

**Which method would you prefer?**
- 🖱️ **One-click button** (easiest)
- ⌨️ **CLI script** (more control)