# Flip 7 Web App

A full-stack web application for the Flip 7 card game, featuring AI players and complete game mechanics.

## Features

- Full game implementation with all rules
- Support for 1-4 players (at least one human, rest are AI)
- AI players with three difficulty levels (conservative, moderate, aggressive)
- Complete scoring system with modifiers and bonuses
- Action cards: FREEZE, FLIP THREE, SECOND CHANCE
- Responsive UI with Tailwind CSS

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Zustand
- **Backend**: Node.js + Express + TypeScript

## Setup

### Install Dependencies

```bash
# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

### Run Development Servers

```bash
# Terminal 1: Start backend server
cd server
npm run dev

# Terminal 2: Start frontend dev server
cd client
npm run dev
```

The app will be available at:
- Frontend: http://localhost:3001
- Backend: http://localhost:5001

## Game Rules

Flip 7 is a press-your-luck card game where players try to be the first to reach 200 points.

- Players take turns hitting (drawing cards) or staying (banking points)
- Number cards (0-12) are worth their face value
- Modifier cards add bonuses (+2, +4, +6, +8, +10) or multiply (×2)
- Drawing a duplicate number card causes a bust (unless you have Second Chance)
- Collecting 7 unique number cards grants a 15-point bonus
- Action cards can freeze players, force draws, or provide second chances

## Project Structure

```
flip7-webapp/
├── client/          # React frontend
├── server/          # Express backend
└── shared/          # Shared types
```

# Flip7
