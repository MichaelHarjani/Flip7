# Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

## Installation

1. Install client dependencies:
```bash
cd client
npm install
```

2. Install server dependencies:
```bash
cd ../server
npm install
```

## Running the Application

### Development Mode

1. Start the backend server (Terminal 1):
```bash
cd server
npm run dev
```
Server will run on http://localhost:5001

2. Start the frontend (Terminal 2):
```bash
cd client
npm run dev
```
Frontend will run on http://localhost:3001

### Production Build

1. Build the client:
```bash
cd client
npm run build
```

2. Build the server:
```bash
cd server
npm run build
npm start
```

## Game Setup

1. Open http://localhost:3001 in your browser
2. Enter your name
3. Select number of players (1-4)
4. Configure AI difficulty levels if playing with AI
5. Click "Start Game"
6. Click "Start Round" to begin

## Features

- ✅ Full game implementation with all rules
- ✅ Support for 1-4 players (at least one human)
- ✅ AI players with 3 difficulty levels
- ✅ Complete scoring with modifiers and bonuses
- ✅ All action cards (FREEZE, FLIP THREE, SECOND CHANCE)
- ✅ Responsive design for mobile and desktop
- ✅ Real-time game state updates

## Troubleshooting

- If the server doesn't start, check that port 5001 is available
- If the client can't connect, verify the proxy settings in `vite.config.ts`
- Make sure both servers are running before starting a game

