import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Verify dist structure exists
try {
  const distPath = __dirname;
  const servicesPath = join(distPath, 'services');
  const routesPath = join(distPath, 'routes');
  
  console.log('Checking dist structure...');
  console.log('Dist path:', distPath);
  console.log('Services exists:', readdirSync(servicesPath).length > 0);
  console.log('Routes exists:', readdirSync(routesPath).length > 0);
} catch (error) {
  console.error('Dist structure check failed:', error);
  process.exit(1);
}

import gameRoutes from './routes/gameRoutes.js';
import { setupWebSocketHandlers } from './websocket/handlers.js';

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

