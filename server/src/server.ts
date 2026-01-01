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

let gameRoutes;
let setupWebSocketHandlers;

try {
  console.log('Importing gameRoutes...');
  const gameRoutesModule = await import('./routes/gameRoutes.js');
  gameRoutes = gameRoutesModule.default;
  console.log('gameRoutes imported successfully');
} catch (error: any) {
  console.error('FAILED to import gameRoutes:', error);
  console.error('Error message:', error?.message);
  console.error('Error code:', error?.code);
  console.error('Error stack:', error?.stack);
  process.exit(1);
}

try {
  console.log('Importing websocket handlers...');
  const handlersModule = await import('./websocket/handlers.js');
  setupWebSocketHandlers = handlersModule.setupWebSocketHandlers;
  console.log('websocket handlers imported successfully');
} catch (error: any) {
  console.error('FAILED to import websocket handlers:', error);
  console.error('Error message:', error?.message);
  console.error('Error code:', error?.code);
  console.error('Error stack:', error?.stack);
  process.exit(1);
}

console.log('=== All imports successful, starting server ===');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

app.use('/api/game', gameRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Setup WebSocket handlers
setupWebSocketHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready`);
});

