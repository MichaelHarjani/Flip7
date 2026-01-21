import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface WebSocketStore {
  socket: Socket | null;
  connected: boolean;
  error: string | null;
  
  // Connect to WebSocket server
  connect: (url?: string) => void;
  
  // Disconnect from server
  disconnect: () => void;
  
  // Emit events
  emit: (event: string, data?: any) => void;
  
  // Listen to events
  on: (event: string, callback: (data: any) => void) => void;
  
  // Remove listener
  off: (event: string, callback?: (data: any) => void) => void;
  
  // Clear error
  clearError: () => void;
}

// WebSocket server URL
// Use VITE_WS_URL from environment variables, or fall back to defaults
const WS_URL = import.meta.env.VITE_WS_URL || (
  import.meta.env.DEV
    ? 'http://localhost:5001'
    : 'https://flip7-server-production.up.railway.app'
);

export const useWebSocketStore = create<WebSocketStore>((set, get) => {
  let socket: Socket | null = null;

  return {
    socket: null,
    connected: false,
    error: null,

    connect: (url?: string) => {
      const wsUrl = url || WS_URL;
      
      // Disconnect existing connection
      if (socket) {
        socket.disconnect();
      }

      socket = io(wsUrl, {
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      socket.on('connect', () => {
        console.log('WebSocket connected');
        set({ connected: true, error: null, socket });
      });

      socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
        set({ connected: false });
      });

      socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        set({ error: error.message || 'Failed to connect to server', connected: false });
      });

      socket.on('error', (data: { message: string }) => {
        console.error('WebSocket error:', data);
        set({ error: data.message || 'WebSocket error' });
      });

      set({ socket });
    },

    disconnect: () => {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
      set({ socket: null, connected: false });
    },

    emit: (event: string, data?: any) => {
      const { socket } = get();
      if (socket && socket.connected) {
        socket.emit(event, data);
      } else {
        console.warn('Cannot emit: socket not connected');
        set({ error: 'Not connected to server' });
      }
    },

    on: (event: string, callback: (data: any) => void) => {
      const { socket } = get();
      if (socket) {
        socket.on(event, callback);
      }
    },

    off: (event: string, callback?: (data: any) => void) => {
      const { socket } = get();
      if (socket) {
        if (callback) {
          socket.off(event, callback);
        } else {
          socket.off(event);
        }
      }
    },

    clearError: () => {
      set({ error: null });
    },
  };
});

