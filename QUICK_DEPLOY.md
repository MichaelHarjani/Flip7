# Quick Deployment Reference

## 🚀 Fast Track Deployment

### Railway Backend (5 minutes)

1. **Railway Dashboard** → New Project → Deploy from GitHub
2. **Settings** → Root Directory → **LEAVE EMPTY** (don't enter anything!)
3. **Variables** → Add:
   - `CLIENT_URL` = `https://your-frontend.vercel.app` (update after frontend deploys)
4. **Copy backend URL** from Settings → Networking

### Vercel Frontend (5 minutes)

1. **Vercel Dashboard** → Add New Project → Import GitHub repo
2. **Environment Variables** → Add:
   - `VITE_WS_URL` = `wss://your-railway-backend.up.railway.app`
3. **Deploy** → Copy frontend URL

### Update Backend CORS (1 minute)

1. **Railway** → Variables → Update `CLIENT_URL` to match Vercel URL exactly
2. Wait for auto-redeploy

### Verify (2 minutes)

```bash
# Run verification script
./verify-deployment.sh <backend-url> <frontend-url>

# Or manually check:
curl https://your-backend.up.railway.app/health
# Should return: {"status":"ok"}
```

Open frontend URL → Check browser console for "WebSocket connected"

---

## ⚠️ Common Mistakes

1. **Railway Root Directory**: Don't enter "repo root" - leave it EMPTY
2. **WebSocket URL**: Must use `wss://` (not `ws://` or `https://`)
3. **CORS URL**: Must include `https://` protocol, no trailing slash
4. **Environment Variables**: Must be set in platform dashboards, not in code

---

## 📋 Environment Variables

**Railway:**
```
CLIENT_URL=https://your-frontend.vercel.app
```

**Vercel:**
```
VITE_WS_URL=wss://your-backend.up.railway.app
```

---

## 🔗 Useful Links

- [Railway Dashboard](https://railway.app)
- [Vercel Dashboard](https://vercel.com)
- [Full Deployment Guide](./DEPLOYMENT.md)
- [Step-by-Step Checklist](./DEPLOYMENT_CHECKLIST.md)

