# Complete Deployment Setup Guide

This guide will walk you through deploying both the frontend and backend for the Flip 7 game.

## Architecture Overview

- **Frontend**: Deploy to Vercel (static React app)
- **Backend**: Deploy to Railway (Express + WebSocket server)

⚠️ **Important**: Vercel serverless functions don't support WebSockets, so the backend must be deployed to a platform that supports persistent connections (Railway, Render, or Fly.io).

---

## Step 1: Deploy Backend to Railway

### 1.1 Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up/login with GitHub
3. Click "New Project"

### 1.2 Deploy from GitHub
1. Select "Deploy from GitHub repo"
2. Choose your repository
3. Railway will auto-detect the project

### 1.3 Configure the Service
1. **IMPORTANT**: Set Root Directory to repository root (leave blank or set to `/`)
   - Click on the service → Settings → Root Directory
   - **DO NOT** set it to `server` - it needs to be the repo root to access the `shared/` directory
2. Railway will use the `railway.json` configuration which handles building from the root
3. The build process will:
   - Copy the `shared/` directory into `server/` (via prebuild script)
   - Install dependencies in `server/`
   - Build TypeScript files
   - Start the server from `server/` directory

### 1.4 Set Environment Variables
1. Go to the service → Variables tab
2. Add the following:
   - **Key**: `CLIENT_URL`
   - **Value**: `https://your-frontend.vercel.app` (you'll update this after deploying frontend)
   - **Key**: `PORT`
   - **Value**: (Railway sets this automatically, but you can leave it)

### 1.5 Get Your Backend URL
1. After deployment, Railway will provide a URL like: `https://your-app.up.railway.app`
2. **Save this URL** - you'll need it for the frontend configuration
3. Test the health endpoint: `https://your-app.up.railway.app/health` (should return `{"status":"ok"}`)

---

## Step 2: Deploy Frontend to Vercel

### 2.1 Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up/login with GitHub

### 2.2 Import Project
1. Click "Add New Project"
2. Import your GitHub repository
3. Vercel will auto-detect it's a Vite project

### 2.3 Configure Project Settings
1. **Framework Preset**: Vite (auto-detected)
2. **Root Directory**: `client` (IMPORTANT: Change from root to `client`)
3. **Build Command**: `npm run build` (auto-detected)
4. **Output Directory**: `dist` (auto-detected)
5. **Install Command**: `npm install` (auto-detected)

### 2.4 Set Environment Variables
1. Before deploying, go to "Environment Variables"
2. Add the following:
   - **Key**: `VITE_WS_URL`
   - **Value**: `wss://your-app.up.railway.app` (use your Railway URL from Step 1.5, with `wss://` protocol)
   - **Environment**: Production, Preview, Development (select all)

### 2.5 Deploy
1. Click "Deploy"
2. Wait for the build to complete
3. Vercel will provide a URL like: `https://your-app.vercel.app`

---

## Step 3: Update Backend CORS Configuration

### 3.1 Update Railway Environment Variable
1. Go back to Railway → Your service → Variables
2. Update `CLIENT_URL` to match your Vercel URL:
   - **Key**: `CLIENT_URL`
   - **Value**: `https://your-app.vercel.app` (your actual Vercel URL)
3. Railway will automatically redeploy

---

## Step 4: Verify Deployment

### 4.1 Test Backend
- Health check: `https://your-app.up.railway.app/health`
- Should return: `{"status":"ok"}`

### 4.2 Test Frontend
1. Open your Vercel URL: `https://your-app.vercel.app`
2. Open browser DevTools → Console
3. Check for WebSocket connection messages
4. Try starting a game

### 4.3 Common Issues

**WebSocket Connection Fails:**
- Verify `VITE_WS_URL` in Vercel matches your Railway URL (with `wss://` protocol)
- Check Railway logs for CORS errors
- Ensure `CLIENT_URL` in Railway matches your Vercel URL exactly

**API Calls Fail:**
- The frontend should automatically use the Railway server for API calls (thanks to the recent fix)
- Check browser Network tab to see where requests are going
- Verify Railway server is running (check Railway dashboard)

**CORS Errors:**
- Ensure `CLIENT_URL` in Railway includes `https://` protocol
- Ensure URLs match exactly (no trailing slashes)

---

## Alternative: Deploy Backend to Render

If you prefer Render over Railway:

### Render Setup Steps:
1. Go to [render.com](https://render.com) and sign in
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: flip7-server
   - **Root Directory**: `server`
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. Set environment variables:
   - `CLIENT_URL`: Your Vercel frontend URL
6. Deploy
7. Render will provide a URL like: `https://your-app.onrender.com`
8. Update `VITE_WS_URL` in Vercel to: `wss://your-app.onrender.com`

---

## Environment Variables Summary

### Frontend (Vercel)
```
VITE_WS_URL=wss://your-backend.up.railway.app
```

### Backend (Railway)
```
CLIENT_URL=https://your-frontend.vercel.app
PORT=(auto-set by Railway)
```

---

## Quick Checklist

- [ ] Backend deployed to Railway
- [ ] Backend health check works (`/health` endpoint)
- [ ] Frontend deployed to Vercel
- [ ] `VITE_WS_URL` set in Vercel (points to Railway backend)
- [ ] `CLIENT_URL` set in Railway (points to Vercel frontend)
- [ ] Game starts successfully in production
- [ ] WebSocket connection established (check browser console)

---

## Troubleshooting Railway Build Failures

### Build Fails with "Cannot find module '../shared'"

This happens when Railway can't access the `shared/` directory. Fix it by:

1. **Check Root Directory Setting**:
   - Go to Railway → Your service → Settings → Root Directory
   - **Set it to `/` (repo root)** or leave it blank
   - **DO NOT** set it to `server`

2. **Verify Build Script**:
   - The `prebuild` script in `server/package.json` should copy the shared directory
   - Check Railway build logs to see if "Copying shared directory..." appears

3. **Manual Fix** (if above doesn't work):
   - In Railway, go to Settings → Build Command
   - Set to: `cd server && npm install && npm run build`
   - Set Start Command to: `cd server && npm start`

### Other Common Issues

**"Failed to build an image"**:
- Check Railway build logs for specific error messages
- Ensure Node.js version is 18+ (Railway auto-detects, but you can set it in Settings)
- Verify all dependencies are listed in `server/package.json`

**TypeScript compilation errors**:
- Check that `shared/` directory exists in the repo
- Verify `server/tsconfig.json` includes the shared directory
- Look for specific TypeScript errors in Railway build logs

## Need Help?

If you encounter issues:
1. Check Railway logs: Railway dashboard → Your service → Deployments → View logs
2. Check Vercel logs: Vercel dashboard → Your project → Deployments → View function logs
3. Check browser console for client-side errors
4. Verify all environment variables are set correctly
5. Ensure Root Directory in Railway is set to repo root (not `server`)

