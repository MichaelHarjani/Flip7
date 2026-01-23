import { create } from 'zustand';
import type { GameRoom } from '@shared/types/index';
import { useWebSocketStore } from './websocketStore';

interface RoomStore {
  roomCode: string | null;
  room: GameRoom | null;
  sessionId: string | null;  // Deprecated: use getSessionId() instead
  playerId: string | null;    // Deprecated: use getPlayerId() instead
  isHost: boolean;
  loading: boolean;
  error: string | null;

  // Getters that read from sessionStorage (unique per tab)
  getSessionId: () => string | null;
  getPlayerId: () => string | null;

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
  // Helper functions to persist player identity per tab using sessionStorage
  const savePlayerIdentity = (sessionId: string, playerId: string, roomCode?: string) => {
    console.log('[RoomStore] Saving player identity to sessionStorage', { sessionId, playerId, roomCode });
    sessionStorage.setItem('flip7_sessionId', sessionId);
    sessionStorage.setItem('flip7_playerId', playerId);
    if (roomCode) {
      sessionStorage.setItem('flip7_roomCode', roomCode);
    }
  };

  const getPlayerIdentity = () => {
    return {
      sessionId: sessionStorage.getItem('flip7_sessionId'),
      playerId: sessionStorage.getItem('flip7_playerId'),
    };
  };

  const clearPlayerIdentity = () => {
    sessionStorage.removeItem('flip7_sessionId');
    sessionStorage.removeItem('flip7_playerId');
    sessionStorage.removeItem('flip7_roomCode');
  };

  // Setup WebSocket listeners - called when socket connects
  const setupListeners = () => {
    const wsStoreState = useWebSocketStore.getState();
    const { socket, on } = wsStoreState;

    if (!socket) return;

    // Room created
    on('room:created', (data: { room: GameRoom; sessionId: string; playerId: string }) => {
      savePlayerIdentity(data.sessionId, data.playerId, data.room.roomCode);
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
      savePlayerIdentity(data.sessionId, data.playerId, data.room.roomCode);
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
        // Preserve this tab's player identity from sessionStorage
        // (Don't let room updates overwrite our local player ID)
        const localIdentity = getPlayerIdentity();
        console.log('[RoomStore] room:updated event received', {
          roomPlayers: data.room.players.map(p => ({ playerId: p.playerId, name: p.name })),
          mySessionId: localIdentity.sessionId,
          myPlayerId: localIdentity.playerId,
        });
        set({
          room: data.room,
          // Keep sessionStorage values, don't overwrite with room data
          sessionId: localIdentity.sessionId,
          playerId: localIdentity.playerId,
        });
      }
    });

    // Matchmaking matched
    on('matchmaking:matched', (data: { room: GameRoom; sessionId: string; playerId: string }) => {
      savePlayerIdentity(data.sessionId, data.playerId, data.room.roomCode);
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

    // Game state received (game started)
    on('game:state', (data: { gameState: any }) => {
      console.log('game:state received in roomStore', data);
      // Reset loading state when game starts
      set({ loading: false, error: null });
    });

    // Host migrated
    on('host:migrated', (data: { newHostId: string; newHostName: string; message: string }) => {
      console.log('[RoomStore] Host migrated:', data);
      const localIdentity = getPlayerIdentity();
      const amINewHost = localIdentity.sessionId === data.newHostId;

      set({
        isHost: amINewHost,
        error: null, // Clear any previous errors
      });

      // Show notification to user
      if (amINewHost) {
        console.log('[RoomStore] You are now the host!');
      }
    });

    // Player disconnected
    on('player:disconnected', (data: { sessionId: string; playerId: string }) => {
      console.log('[RoomStore] Player disconnected:', data);
      // Room will be updated via room:updated event
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

  // Initialize from sessionStorage (to restore state on page reload)
  const savedIdentity = getPlayerIdentity();

  return {
    roomCode: null,
    room: null,
    sessionId: savedIdentity.sessionId,
    playerId: savedIdentity.playerId,
    isHost: false,
    loading: false,
    error: null,

    // Getters that always read from sessionStorage (unique per tab)
    getSessionId: () => sessionStorage.getItem('flip7_sessionId'),
    getPlayerId: () => sessionStorage.getItem('flip7_playerId'),

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
      const { roomCode, getSessionId } = get();
      const sessionId = getSessionId();
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
      clearPlayerIdentity();
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

