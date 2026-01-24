import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Verify dist structure exists and log everything
console.log('=== Server Startup Debug ===');
console.log('Current directory:', process.cwd());
console.log('__dirname:', __dirname);
console.log('__filename:', __filename);

try {
  const distPath = __dirname;
  const servicesPath = join(distPath, 'services');
  const routesPath = join(distPath, 'routes');
  const websocketPath = join(distPath, 'websocket');
  
  console.log('Checking dist structure...');
  console.log('Dist path:', distPath);
  console.log('Dist exists:', existsSync(distPath));
  
  if (existsSync(servicesPath)) {
    const services = readdirSync(servicesPath);
    console.log('Services directory exists, files:', services);
    console.log('gameService.js exists:', existsSync(join(servicesPath, 'gameService.js')));
  } else {
    console.error('ERROR: Services directory does not exist!');
  }
  
  if (existsSync(routesPath)) {
    const routes = readdirSync(routesPath);
    console.log('Routes directory exists, files:', routes);
  } else {
    console.error('ERROR: Routes directory does not exist!');
  }
  
  if (existsSync(websocketPath)) {
    const websocket = readdirSync(websocketPath);
    console.log('Websocket directory exists, files:', websocket);
  } else {
    console.error('ERROR: Websocket directory does not exist!');
  }
} catch (error: any) {
  console.error('Dist structure check failed:', error);
  console.error('Error stack:', error?.stack);
}

console.log('=== Attempting to import modules ===');

// Use regular imports instead of dynamic imports for better compatibility
import gameRoutes from './routes/gameRoutes.js';
import { setupWebSocketHandlers } from './websocket/handlers.js';

// New SSE+REST API routes
import roomsRouter from './api/rooms.js';
import gameActionsRouter from './api/game-actions.js';
import sseRouter from './api/sse.js';

// Services for cleanup
import { roomService } from './services/roomService.js';
import { sessionService } from './services/sessionService.js';
import { gameStateBufferService } from './services/gameStateBuffer.js';

console.log('=== All imports successful, starting server ===');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = Number(process.env.PORT) || 5001;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json());

// Legacy single-player game routes
app.use('/api/game', gameRoutes);

// New multiplayer REST API routes
app.use('/api/rooms', roomsRouter);
app.use('/api/game-mp', gameActionsRouter);
app.use('/api/sse', sseRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Setup WebSocket handlers
setupWebSocketHandlers(io);

// Setup periodic cleanup tasks
const CLEANUP_INTERVAL = 60000; // Run cleanup every 60 seconds
setInterval(() => {
  console.log('[Cleanup] Running periodic cleanup...');

  // Clean up old sessions (disconnected for more than 5 minutes)
  sessionService.cleanupDisconnectedSessions(300000);

  // Clean up empty or old rooms
  roomService.cleanupRooms();

  // Clean up old game state buffers
  gameStateBufferService.cleanupOldBuffers();

  console.log('[Cleanup] Cleanup complete');
}, CLEANUP_INTERVAL);

httpServer.listen(PORT, HOST, () => {
  console.log(`Server running on ${HOST}:${PORT}`);
  console.log(`WebSocket server ready`);
  console.log(`Health endpoint: http://${HOST}:${PORT}/health`);
  console.log(`Cleanup task scheduled every ${CLEANUP_INTERVAL / 1000} seconds`);
});

