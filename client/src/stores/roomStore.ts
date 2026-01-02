import { create } from 'zustand';
import type { GameRoom } from '@shared/types/index';
import { useWebSocketStore } from './websocketStore';

interface RoomStore {
  roomCode: string | null;
  room: GameRoom | null;
  sessionId: string | null;
  playerId: string | null;
  isHost: boolean;
  loading: boolean;
  error: string | null;

  // Actions
  createRoom: (name: string) => Promise<void>;
  joinRoom: (code: string, name: string) => Promise<void>;
  leaveRoom: () => void;
  startMatchmaking: (name: string, maxPlayers?: number) => Promise<void>;
  startGame: () => void;
  clearError: () => void;
  reset: () => void;
}

export const useRoomStore = create<RoomStore>((set, get) => {
  // Setup WebSocket listeners - called when socket connects
  const setupListeners = () => {
    const wsStoreState = useWebSocketStore.getState();
    const { socket, on } = wsStoreState;

    if (!socket) return;

    // Room created
    on('room:created', (data: { room: GameRoom; sessionId: string; playerId: string }) => {
      set({
        room: data.room,
        roomCode: data.room.roomCode,
        sessionId: data.sessionId,
        playerId: data.playerId,
        isHost: true,
        loading: false,
        error: null,
      });
    });

    // Room joined
    on('room:joined', (data: { room: GameRoom; sessionId: string; playerId: string }) => {
      set({
        room: data.room,
        roomCode: data.room.roomCode,
        sessionId: data.sessionId,
        playerId: data.playerId,
        isHost: false,
        loading: false,
        error: null,
      });
    });

    // Room updated
    on('room:updated', (data: { room: GameRoom }) => {
      const currentRoom = get().room;
      if (currentRoom && currentRoom.roomCode === data.room.roomCode) {
        set({ room: data.room });
      }
    });

    // Matchmaking matched
    on('matchmaking:matched', (data: { room: GameRoom; sessionId: string; playerId: string }) => {
      set({
        room: data.room,
        roomCode: data.room.roomCode,
        sessionId: data.sessionId,
        playerId: data.playerId,
        isHost: data.room.hostId === data.sessionId,
        loading: false,
        error: null,
      });
    });

    // Matchmaking queued
    on('matchmaking:queued', () => {
      set({ loading: true, error: null });
    });

    // Error
    on('error', (data: { message: string }) => {
      set({ error: data.message, loading: false });
    });
  };

  // Subscribe to websocket store changes to set up listeners when socket connects
  useWebSocketStore.subscribe((state, prevState) => {
    // Set up listeners when socket becomes connected
    if (state.connected && !prevState.connected) {
      setupListeners();
    }
  });

  // Initialize listeners if socket already exists
  const wsStoreState = useWebSocketStore.getState();
  if (wsStoreState.socket && wsStoreState.connected) {
    setupListeners();
  }

  return {
    roomCode: null,
    room: null,
    sessionId: null,
    playerId: null,
    isHost: false,
    loading: false,
    error: null,

    createRoom: async (name: string) => {
      const wsStoreState = useWebSocketStore.getState();
      
      if (!wsStoreState.socket || !wsStoreState.connected) {
        wsStoreState.connect();
        // Wait for connection with proper check
        let attempts = 0;
        while (!useWebSocketStore.getState().connected && attempts < 20) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        if (!useWebSocketStore.getState().connected) {
          set({ error: 'Failed to connect to server', loading: false });
          return;
        }
      }

      set({ loading: true, error: null });
      useWebSocketStore.getState().emit('room:create', { playerName: name });
    },

    joinRoom: async (code: string, name: string) => {
      const wsStoreState = useWebSocketStore.getState();
      
      if (!wsStoreState.socket || !wsStoreState.connected) {
        wsStoreState.connect();
        // Wait for connection with proper check
        let attempts = 0;
        while (!useWebSocketStore.getState().connected && attempts < 20) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        if (!useWebSocketStore.getState().connected) {
          set({ error: 'Failed to connect to server', loading: false });
          return;
        }
      }

      set({ loading: true, error: null });
      useWebSocketStore.getState().emit('room:join', { roomCode: code.toUpperCase(), playerName: name });
    },

    leaveRoom: () => {
      const { roomCode, sessionId } = get();
      if (roomCode && sessionId) {
        useWebSocketStore.getState().emit('room:leave');
      }
      get().reset();
    },

    startMatchmaking: async (name: string, maxPlayers: number = 4) => {
      const wsStoreState = useWebSocketStore.getState();
      
      if (!wsStoreState.socket || !wsStoreState.connected) {
        wsStoreState.connect();
        // Wait for connection with proper check
        let attempts = 0;
        while (!useWebSocketStore.getState().connected && attempts < 20) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        if (!useWebSocketStore.getState().connected) {
          set({ error: 'Failed to connect to server', loading: false });
          return;
        }
      }

      set({ loading: true, error: null });
      useWebSocketStore.getState().emit('matchmaking:join', { playerName: name, maxPlayers });
    },

    startGame: () => {
      const wsStore = useWebSocketStore.getState();
      console.log('startGame called', { connected: wsStore.connected, socket: !!wsStore.socket });
      
      if (!wsStore.connected || !wsStore.socket) {
        set({ error: 'Not connected to server. Please wait for connection.', loading: false });
        console.error('Cannot start game: WebSocket not connected');
        return;
      }
      
      set({ loading: true, error: null });
      wsStore.emit('game:start');
    },

    clearError: () => {
      set({ error: null });
    },

    reset: () => {
      set({
        roomCode: null,
        room: null,
        sessionId: null,
        playerId: null,
        isHost: false,
        loading: false,
        error: null,
      });
    },
  };
});

