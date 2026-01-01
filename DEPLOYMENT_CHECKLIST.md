# Deployment Checklist - Flip7 Webapp

Follow this checklist step-by-step to deploy your Flip7 webapp.

## Prerequisites

- [ ] GitHub repository is up to date and pushed
- [ ] Railway account created (https://railway.app)
- [ ] Vercel account created (https://vercel.com)

---

## Step 1: Deploy Backend to Railway

### 1.1 Create Railway Project

- [ ] Go to [railway.app](https://railway.app) and sign in
- [ ] Click "New Project" → "Deploy from GitHub repo"
- [ ] Select your `flip7-webapp` repository
- [ ] Railway will create a new service

### 1.2 Configure Root Directory

- [ ] Go to your service → **Settings** → **Root Directory**
- [ ] **IMPORTANT**: Leave the field **EMPTY** (or set to `/`)
- [ ] **DO NOT** enter "repo root" or "server" - leave it blank!
- [ ] Save the changes

### 1.3 Set Environment Variables

- [ ] Go to **Variables** tab
- [ ] Add environment variable:
  - **Key**: `CLIENT_URL`
  - **Value**: `https://michael-flip7.vercel.app` (or your Vercel URL - will update after frontend deploys)
- [ ] Note: `PORT` is automatically set by Railway

### 1.4 Verify Deployment

- [ ] Wait for deployment to complete (check Deployments tab)
- [ ] Once deployed, go to **Settings** → **Networking**
- [ ] Copy your Railway backend URL (e.g., `https://flip7-production.up.railway.app`)
- [ ] Test health endpoint: Open `https://your-backend-url/health` in browser
- [ ] Should see: `{"status":"ok"}`

**Backend URL**: `https://________________________.up.railway.app`

---

## Step 2: Deploy Frontend to Vercel

### 2.1 Create Vercel Project

- [ ] Go to [vercel.com](https://vercel.com) and sign in
- [ ] Click "Add New Project"
- [ ] Import your GitHub repository (`flip7-webapp`)

### 2.2 Configure Project Settings

- [ ] **Framework Preset**: Vite (should auto-detect)
- [ ] **Root Directory**: `client` (should auto-detect from `vercel.json`)
- [ ] **Build Command**: `npm run build` (should auto-detect)
- [ ] **Output Directory**: `dist` (should auto-detect from `vercel.json`)
- [ ] **Install Command**: `npm install` (should auto-detect)

### 2.3 Set Environment Variables

- [ ] Go to **Environment Variables** section
- [ ] Add environment variable:
  - **Key**: `VITE_WS_URL`
  - **Value**: `wss://your-railway-backend-url.up.railway.app` (use the URL from Step 1.4)
- [ ] Make sure to use `wss://` protocol (not `ws://` or `https://`)

### 2.4 Deploy

- [ ] Click "Deploy"
- [ ] Wait for build to complete
- [ ] Copy your Vercel frontend URL (e.g., `https://michael-flip7.vercel.app`)

**Frontend URL**: `https://________________________.vercel.app`

---

## Step 3: Update Backend CORS Configuration

### 3.1 Update Railway Environment Variable

- [ ] Go back to Railway → Your service → **Variables**
- [ ] Update `CLIENT_URL` to match your exact Vercel frontend URL:
  - **Key**: `CLIENT_URL`
  - **Value**: `https://your-frontend.vercel.app` (no trailing slash)
- [ ] Railway will automatically redeploy

### 3.2 Verify CORS Update

- [ ] Wait for Railway redeployment to complete
- [ ] Check deployment logs for any errors

---

## Step 4: Verify Deployment

### 4.1 Test Frontend

- [ ] Open your Vercel frontend URL in a browser
- [ ] Open browser Developer Tools (F12) → Console tab
- [ ] Look for: `WebSocket connected` message
- [ ] Verify no CORS errors in console

### 4.2 Test Backend Health

- [ ] Visit: `https://your-railway-backend-url/health`
- [ ] Should return: `{"status":"ok"}`

### 4.3 Test Multiplayer Features

- [ ] Click "Multiplayer" on the frontend
- [ ] Try creating a room
- [ ] Try joining a room (open in another browser/incognito)
- [ ] Start a game
- [ ] Verify game state updates in real-time
- [ ] Check browser console for any errors

### 4.4 Final Checklist

- [ ] Frontend loads without errors
- [ ] Browser console shows "WebSocket connected"
- [ ] Can create/join rooms
- [ ] Can start multiplayer games
- [ ] Game state updates in real-time
- [ ] No CORS errors in console
- [ ] No WebSocket connection errors

---

## Troubleshooting

### Railway Deployment Fails

**Error: "Could not find root directory: repo root"**
- **Fix**: Go to Settings → Root Directory and **clear the field** (leave it empty)

**Error: "Cannot find module '../shared/..."**
- **Fix**: Ensure Root Directory is set to repo root (empty), not `server`
- The `server/build.js` script should copy shared files automatically

**Build fails with TypeScript errors**
- Check Railway build logs for specific errors
- Verify Node.js version is 18+ (Railway auto-detects)

### Vercel Deployment Fails

**Build fails**
- Verify `client/package.json` has all dependencies
- Check Vercel build logs for specific errors
- Ensure `VITE_WS_URL` is set correctly

**Frontend can't connect to backend**
- Verify `VITE_WS_URL` uses `wss://` protocol (not `ws://` or `https://`)
- Check that Railway backend is running and accessible
- Verify backend URL is correct

### WebSocket Connection Issues

**Console shows "WebSocket connection error"**
- Verify `VITE_WS_URL` environment variable is set in Vercel
- Check that Railway backend URL is correct
- Ensure backend is running (check Railway deployments)
- Verify `CLIENT_URL` in Railway matches frontend URL exactly

**CORS errors in console**
- Ensure `CLIENT_URL` in Railway includes `https://` protocol
- Remove trailing slash from `CLIENT_URL` if present
- Verify frontend and backend URLs match exactly

### Game Features Not Working

**Can't create/join rooms**
- Check browser console for WebSocket errors
- Verify WebSocket is connected (should see "WebSocket connected")
- Check Railway deployment logs for backend errors

**Game state not updating**
- Verify WebSocket connection is active
- Check browser console for errors
- Verify backend is processing WebSocket events (check Railway logs)

---

## Environment Variables Summary

### Railway (Backend)
```
CLIENT_URL=https://your-frontend.vercel.app
PORT=5001 (auto-set by Railway)
```

### Vercel (Frontend)
```
VITE_WS_URL=wss://your-backend.up.railway.app
```

---

## Quick Reference URLs

**Railway Dashboard**: https://railway.app
**Vercel Dashboard**: https://vercel.com

**Your URLs**:
- Backend: `https://________________________.up.railway.app`
- Frontend: `https://________________________.vercel.app`

---

## Next Steps After Deployment

1. **Monitor**: Check Railway and Vercel dashboards for any errors
2. **Test**: Have friends test multiplayer functionality
3. **Optimize**: Consider adding database for game state persistence (currently in-memory)
4. **Scale**: Monitor usage and upgrade plans if needed

---

## Support

If you encounter issues not covered here:
1. Check Railway deployment logs
2. Check Vercel build logs
3. Check browser console for errors
4. Verify all environment variables are set correctly
5. Review `DEPLOYMENT.md` for additional details

