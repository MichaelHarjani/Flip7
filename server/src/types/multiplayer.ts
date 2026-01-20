export interface PlayerToken {
  playerId: string;      // UUID only, no prefix
  roomCode: string;
  playerName: string;
  isHost: boolean;
  iat: number;           // issued at
  exp: number;           // expires
}

export interface Room {
  roomCode: string;
  gameId: string | null;
  status: 'waiting' | 'playing' | 'ended';
  players: RoomPlayer[];
  createdAt: Date;
}

export interface RoomPlayer {
  playerId: string;      // UUID only
  name: string;
  isHost: boolean;
  connected: boolean;
}

export interface GameAction {
  type: 'hit' | 'stay' | 'playActionCard' | 'nextRound';
  playerId: string;
  cardId?: string;       // for playActionCard
  targetPlayerId?: string;
}
