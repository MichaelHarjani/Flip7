# Railway Build Fix - Quick Reference

## The Problem
Railway build fails because the server code imports from `../shared/` directory, which isn't accessible when Railway builds from the `server/` directory.

## The Solution

### Option 1: Configure Railway Root Directory (Recommended)

1. Go to Railway dashboard → Your service
2. Click **Settings** → **Root Directory**
3. **Set Root Directory to `/`** (repo root) or leave it blank
4. **DO NOT** set it to `server`
5. Railway will use the `railway.json` config which handles building correctly

### Option 2: Manual Build Configuration

If Option 1 doesn't work, manually set the build commands:

1. Go to Railway dashboard → Your service → **Settings**
2. Under **Build & Deploy**:
   - **Build Command**: `cd server && npm install && npm run build`
   - **Start Command**: `cd server && npm start`
3. Set **Root Directory** to `/` (repo root)

## What Was Fixed

1. **Added `server/build.js`**: Pre-build script that copies `shared/` directory into `server/` before TypeScript compilation
2. **Updated `server/package.json`**: Added `prebuild` script that runs the build script
3. **Updated `server/railway.json`**: Configured build and start commands to work from repo root

## Verify It Works

After redeploying, check Railway build logs for:
- ✅ "Copying shared directory..."
- ✅ "Copied types directory"
- ✅ "Copied utils directory"
- ✅ TypeScript compilation succeeds
- ✅ Server starts successfully

## Still Having Issues?

1. Check Railway build logs for specific error messages
2. Verify `shared/` directory exists in your GitHub repo
3. Ensure Root Directory is set to repo root (not `server`)
4. Make sure Node.js version is 18+ (Railway auto-detects)

