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
  createRoom: (name: string, maxPlayers?: number) => Promise<void>;
  joinRoom: (code: string, name: string) => Promise<void>;
  leaveRoom: () => void;
  startMatchmaking: (name: string, maxPlayers?: number) => Promise<void>;
  startGame: () => void;
  clearError: () => void;
  reset: () => void;
}

export const useRoomStore = create<RoomStore>((set, get) => {
  const wsStore = useWebSocketStore.getState();

  // Setup WebSocket listeners
  const setupListeners = () => {
    const { socket, on, off } = wsStore;

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
    on('matchmaking:queued', (data: { message: string }) => {
      set({ loading: true, error: null });
    });

    // Error
    on('error', (data: { message: string }) => {
      set({ error: data.message, loading: false });
    });
  };

  // Initialize listeners when store is created
  if (wsStore.socket) {
    setupListeners();
  } else {
    // Wait for socket to be created
    const checkSocket = setInterval(() => {
      if (wsStore.socket) {
        setupListeners();
        clearInterval(checkSocket);
      }
    }, 100);
  }

  return {
    roomCode: null,
    room: null,
    sessionId: null,
    playerId: null,
    isHost: false,
    loading: false,
    error: null,

    createRoom: async (name: string, maxPlayers: number = 4) => {
      const { socket, connect } = wsStore;
      
      if (!socket || !socket.connected) {
        connect();
        // Wait a bit for connection
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      set({ loading: true, error: null });
      wsStore.emit('room:create', { playerName: name, maxPlayers });
    },

    joinRoom: async (code: string, name: string) => {
      const { socket, connect } = wsStore;
      
      if (!socket || !socket.connected) {
        connect();
        // Wait a bit for connection
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      set({ loading: true, error: null });
      wsStore.emit('room:join', { roomCode: code.toUpperCase(), playerName: name });
    },

    leaveRoom: () => {
      const { roomCode, sessionId } = get();
      if (roomCode && sessionId) {
        wsStore.emit('room:leave');
      }
      get().reset();
    },

    startMatchmaking: async (name: string, maxPlayers: number = 4) => {
      const { socket, connect } = wsStore;
      
      if (!socket || !socket.connected) {
        connect();
        // Wait a bit for connection
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      set({ loading: true, error: null });
      wsStore.emit('matchmaking:join', { playerName: name, maxPlayers });
    },

    startGame: () => {
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

