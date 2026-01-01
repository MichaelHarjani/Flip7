import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
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
