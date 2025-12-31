# Deployment Guide - Vercel

This guide explains how to deploy the Flip 7 web app to Vercel.

## Architecture

The app is deployed as:
- **Frontend**: Static site built with Vite (React + TypeScript)
- **Backend**: Vercel Serverless Functions (converted from Express)

## Prerequisites

1. A Vercel account (free tier works)
2. GitHub repository connected to Vercel
3. Node.js 18+ (for local testing)

## Deployment Steps

### 1. Connect Repository to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)

### 2. Environment Variables

**No environment variables are required** for basic deployment. The frontend uses relative API paths (`/api/game`) which work automatically on Vercel.

If you need to point to an external API, you can optionally add:
- **Key**: `VITE_API_BASE_URL`
- **Value**: Your external API URL (e.g., `https://your-api.com/api/game`)

### 3. Deploy

Click "Deploy" and wait for the build to complete.

## Project Structure

```
flip7-webapp/
├── api/                    # Vercel Serverless Functions
│   └── game/               # Game API endpoints
├── client/                  # React frontend
├── server/                  # Original Express server (not used in Vercel)
├── shared/                  # Shared types and utilities
├── vercel.json             # Vercel configuration
└── package.json            # Root dependencies
```

## API Endpoints

All endpoints are available at `/api/game/*`:

- `POST /api/game/start` - Start a new game
- `POST /api/game/:gameId/round/start` - Start a round
- `POST /api/game/:gameId/hit` - Player hits
- `POST /api/game/:gameId/stay` - Player stays
- `POST /api/game/:gameId/action` - Play action card
- `GET /api/game/:gameId/state` - Get game state
- `POST /api/game/:gameId/round/next` - Start next round
- `POST /api/game/:gameId/ai/decision` - Get AI decision

## Important Notes

### Game State Storage

⚠️ **Current Limitation**: Game state is stored in memory. This means:
- Games will reset when serverless functions experience cold starts
- For production use, consider implementing a database (Redis, MongoDB, etc.)

### Local Development

For local development, you can still use the original Express server:

```bash
# Terminal 1: Start backend
cd server
npm run dev

# Terminal 2: Start frontend
cd client
npm run dev
```

The frontend will use the Vite proxy to connect to `localhost:5001`.

## Troubleshooting

### Build Fails

- Ensure all dependencies are installed: `npm install` in root directory
- Check that TypeScript compiles: `cd client && npm run build`

### API Routes Not Working

- Verify `vercel.json` is in the root directory
- Check that `api/` directory exists with serverless functions
- Ensure `@vercel/node` is installed (included in root `package.json`)

### Games Reset Unexpectedly

This is expected behavior with in-memory storage. Consider implementing persistent storage for production use.

## Next Steps

For production use, consider:
1. Adding a database (Redis, MongoDB) for game state persistence
2. Implementing authentication if needed
3. Adding rate limiting for API endpoints
4. Setting up monitoring and error tracking

