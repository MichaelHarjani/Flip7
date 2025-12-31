# Deployment Guide

This guide explains how to deploy the Flip 7 web app with multiplayer support.

## Architecture

The app consists of:
- **Frontend**: Static site built with Vite (React + TypeScript) - Deployed to Vercel
- **Backend**: Express server with WebSocket support - Deployed to Railway/Render/Fly.io

## Prerequisites

1. A Vercel account (free tier works)
2. A Railway/Render/Fly.io account (for WebSocket server)
3. GitHub repository connected to both platforms

## Deployment Steps

### 1. Deploy WebSocket Server (Railway/Render)

The WebSocket server requires a platform that supports persistent connections.

#### Option A: Railway (Recommended)

1. Go to [railway.app](https://railway.app) and sign in
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will auto-detect the `server/` directory
5. Set environment variables:
   - `PORT`: (auto-set by Railway)
   - `CLIENT_URL`: Your Vercel frontend URL (e.g., `https://your-app.vercel.app`)
6. Deploy

Railway will provide a URL like: `https://your-app.up.railway.app`

#### Option B: Render

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

#### Option C: Fly.io

1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. In the `server/` directory, run: `fly launch`
3. Follow the prompts
4. Set environment variable: `fly secrets set CLIENT_URL=https://your-app.vercel.app`
5. Deploy: `fly deploy`

### 2. Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)
5. Set environment variables:
   - **Key**: `VITE_WS_URL`
   - **Value**: Your WebSocket server URL (e.g., `wss://your-app.up.railway.app` or `ws://your-app.onrender.com`)
6. Deploy

### 3. Update WebSocket Server CORS

After deploying the frontend, update the `CLIENT_URL` environment variable on your WebSocket server to match your Vercel URL.

## Environment Variables

### Frontend (Vercel)
- `VITE_WS_URL`: WebSocket server URL (e.g., `wss://your-server.up.railway.app`)

### Backend (Railway/Render/Fly.io)
- `PORT`: Server port (auto-set by platform)
- `CLIENT_URL`: Frontend URL for CORS (e.g., `https://your-app.vercel.app`)

## Project Structure

```
flip7-webapp/
├── api/                    # Vercel Serverless Functions (legacy, not used for multiplayer)
├── client/                 # React frontend (Vercel)
├── server/                 # Express + WebSocket server (Railway/Render/Fly.io)
│   ├── src/
│   │   ├── server.ts       # Main server with WebSocket
│   │   ├── websocket/      # WebSocket handlers
│   │   └── services/       # Room, matchmaking, session services
│   └── Procfile           # For Render deployment
├── shared/                 # Shared types
└── vercel.json            # Vercel configuration
```

## API Endpoints

### REST API (via WebSocket server)
- `POST /api/game/rooms/create` - Create a new room
- `POST /api/game/rooms/join` - Join a room by code
- `POST /api/game/rooms/:roomCode/leave` - Leave a room
- `GET /api/game/rooms/:roomCode` - Get room info
- `POST /api/game/matchmaking/join` - Join matchmaking queue
- `POST /api/game/matchmaking/leave` - Leave matchmaking queue

### WebSocket Events
- `room:create` - Create a room
- `room:join` - Join a room
- `room:leave` - Leave a room
- `game:start` - Start the game
- `game:hit` - Player hits
- `game:stay` - Player stays
- `game:playActionCard` - Play an action card
- `game:nextRound` - Start next round
- `game:state` - Game state update (broadcast)

## Important Notes

### WebSocket Server Requirements

⚠️ **Critical**: The WebSocket server MUST be deployed to a platform that supports persistent connections:
- ✅ Railway
- ✅ Render
- ✅ Fly.io
- ✅ Heroku
- ❌ Vercel (serverless functions don't support WebSockets)

### Game State Storage

⚠️ **Current Limitation**: Game state is stored in memory. This means:
- Games will reset when the server restarts
- For production use, consider implementing a database (Redis, MongoDB, etc.)

### CORS Configuration

Make sure the `CLIENT_URL` environment variable on the WebSocket server matches your Vercel frontend URL exactly, including the protocol (`https://`).

## Troubleshooting

### WebSocket Connection Fails

1. Verify `VITE_WS_URL` is set correctly in Vercel
2. Check that the WebSocket server is running
3. Ensure CORS is configured correctly (`CLIENT_URL` matches frontend URL)
4. Check browser console for connection errors

### Frontend Can't Connect to Backend

1. Verify the WebSocket URL uses the correct protocol:
   - `wss://` for HTTPS frontends
   - `ws://` for HTTP (development only)
2. Check that the server is accessible (try the health endpoint: `https://your-server.com/health`)

### Build Fails

- Ensure all dependencies are installed
- Check that TypeScript compiles: `cd client && npm run build`
- Verify Node.js version (18+ required)

## Local Development

For local development:

```bash
# Terminal 1: Start backend
cd server
npm run dev

# Terminal 2: Start frontend
cd client
npm run dev
```

The frontend will connect to `http://localhost:5001` automatically in development mode.

## Next Steps

For production use, consider:
1. Adding a database (Redis, MongoDB) for game state persistence
2. Implementing authentication if needed
3. Adding rate limiting for API endpoints
4. Setting up monitoring and error tracking
5. Using a CDN for static assets
