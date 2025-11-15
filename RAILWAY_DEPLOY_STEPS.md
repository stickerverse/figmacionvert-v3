# 🚀 Railway Deployment Guide

## **Step-by-Step Instructions**

### **1. Create Railway Account**
- Go to [railway.app](https://railway.app)
- Sign up with GitHub or email

### **2. Deploy Your Service**

#### **Option A: Deploy from Local Files (Easiest)**
1. In Railway dashboard, click **"New Project"**
2. Select **"Deploy from GitHub repo"** 
3. If no GitHub repo yet:
   - Click **"Deploy locally"** 
   - Install Railway CLI: `npm install -g @railway/cli`
   - Login: `railway login`
   - In `capture-service/` folder: `railway up`

#### **Option B: Deploy from GitHub**
1. Push your code to GitHub first:
   ```bash
   cd /Users/skirk92/figmacionvert-2
   git add .
   git commit -m "Add capture service"
   git push
   ```
2. In Railway, connect your GitHub repo
3. Select the `capture-service/` folder as root

### **3. Add Redis Database**
1. In your Railway project dashboard
2. Click **"New Service"** → **"Database"** → **"Add Redis"**
3. Railway will auto-generate Redis connection

### **4. Configure Environment Variables**
In Railway dashboard → Your service → Variables tab, add:

```
NODE_ENV=production
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAXWHDLVBQDPJUFL66
AWS_SECRET_ACCESS_KEY=6MFtUalD+JPcLXQ17vGHjz/gSQH5eGpWsvt05uin
S3_BUCKET=YOUR_BUCKET_NAME_FROM_STEP_1
ALLOWED_API_KEYS=f7df13dd6f622998e79f8ec581cc2f4dc908331cadb426b74ac4b8879d186da2
API_BASE_URL=${{RAILWAY_PUBLIC_DOMAIN}}
REDIS_HOST=${{Redis.REDIS_PRIVATE_URL}}
WORKER_CONCURRENCY=3
```

### **5. Deploy Worker Service (Optional)**
1. Add another service in same project
2. Same GitHub repo, same folder
3. Set Start Command: `node dist/worker.js`
4. Same environment variables

### **6. Get Your Service URL**
- Railway will provide a URL like: `https://myapp-production-abc123.up.railway.app`
- Copy this URL

### **7. Update Figma Plugin**
Edit `figma-plugin/src/code-clean.ts`:
```typescript
const cloudClient = new CloudServiceClient({
  apiBaseUrl: 'https://your-railway-url-here.up.railway.app',
  apiKey: 'f7df13dd6f622998e79f8ec581cc2f4dc908331cadb426b74ac4b8879d186da2',
});
```

### **8. Test Deployment**
```bash
curl https://your-railway-url.up.railway.app/health
```

## **Ready to Deploy!**
Your service is prepared with:
- ✅ Railway config files
- ✅ Environment variables ready
- ✅ Built and tested locally
- ✅ Dependencies resolved

**Which method would you like to use for deployment?**