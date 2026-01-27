import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './authStore';

interface WebSocketStore {
  socket: Socket | null;
  connected: boolean;
  error: string | null;
  reconnecting: boolean;
  connectionQuality: 'good' | 'poor' | 'offline';
  latency: number;

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
    : 'https://flip7-production-31f9.up.railway.app'
);

export const useWebSocketStore = create<WebSocketStore>((set, get) => {
  let socket: Socket | null = null;
  let pingInterval: NodeJS.Timeout | null = null;

  return {
    socket: null,
    connected: false,
    error: null,
    reconnecting: false,
    connectionQuality: 'offline' as const,
    latency: 0,

    connect: (url?: string) => {
      const wsUrl = url || WS_URL;
      console.log('[WebSocket] Connecting to:', wsUrl);

      // Disconnect existing connection
      if (socket) {
        socket.disconnect();
      }

      // Get auth token from authStore if user is signed in
      const authStore = useAuthStore.getState();
      const token = authStore.session?.access_token;

      socket = io(wsUrl, {
        auth: token ? { token } : {}, // Pass token if authenticated, empty object for guests
        transports: ['websocket', 'polling'], // Prefer WebSocket but fallback to polling
        upgrade: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        reconnectionAttempts: Infinity,
        timeout: 20000,
        forceNew: false,
        closeOnBeforeunload: false, // Don't close connection on page unload (mobile background)
      });

      // Start ping/pong heartbeat monitoring
      const startHeartbeat = () => {
        if (pingInterval) clearInterval(pingInterval);

        pingInterval = setInterval(() => {
          if (!socket?.connected) return;

          const startTime = Date.now();
          socket.emit('ping', {}, () => {
            const latency = Date.now() - startTime;
            const quality = latency < 100 ? 'good' : latency < 300 ? 'poor' : 'offline';
            set({ latency, connectionQuality: quality });
          });
        }, 5000); // Ping every 5 seconds
      };

      const stopHeartbeat = () => {
        if (pingInterval) {
          clearInterval(pingInterval);
          pingInterval = null;
        }
      };

      socket.on('connect', () => {
        console.log('[WebSocket] Connected');
        set({ connected: true, error: null, socket, reconnecting: false, connectionQuality: 'good' });
        startHeartbeat();
      });

      socket.on('disconnect', (reason) => {
        console.log('[WebSocket] Disconnected:', reason);
        set({ connected: false, connectionQuality: 'offline' });
        stopHeartbeat();
      });

      socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`[WebSocket] Reconnection attempt ${attemptNumber}`);
        set({ reconnecting: true, error: null });
      });

      socket.on('reconnect', (attemptNumber) => {
        console.log(`[WebSocket] Reconnected after ${attemptNumber} attempts`);
        set({ connected: true, error: null, reconnecting: false, connectionQuality: 'good' });
        startHeartbeat();

        // Attempt to restore session if we have stored credentials
        const sessionId = sessionStorage.getItem('flip7_sessionId');
        const roomCode = sessionStorage.getItem('flip7_roomCode');

        if (sessionId && roomCode && socket) {
          console.log(`[WebSocket] Restoring session ${sessionId} in room ${roomCode}`);
          socket.emit('session:restore', { sessionId, roomCode });
        }
      });

      socket.on('reconnect_error', (error) => {
        console.error('[WebSocket] Reconnection error:', error);
      });

      socket.on('reconnect_failed', () => {
        console.error('[WebSocket] Reconnection failed after all attempts');
        set({ error: 'Failed to reconnect to server', reconnecting: false, connectionQuality: 'offline' });
        stopHeartbeat();
      });

      socket.on('connect_error', (error) => {
        console.error('[WebSocket] Connection error:', error);
        set({ error: error.message || 'Failed to connect to server', connected: false, connectionQuality: 'offline' });
      });

      socket.on('error', (data: { message: string }) => {
        console.error('[WebSocket] Error:', data);
        set({ error: data.message || 'WebSocket error' });
      });

      // Handle pong response from server
      socket.on('pong', () => {
        // Pong received, connection is alive
      });

      set({ socket });
    },

    disconnect: () => {
      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
      }
      if (socket) {
        socket.disconnect();
        socket = null;
      }
      set({ socket: null, connected: false, connectionQuality: 'offline' });
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

