// Shared types for Flip 7 game

export interface Card {
  id: string;
  type: 'number' | 'action' | 'modifier';
  value?: number; // For number cards (0-12)
  actionType?: 'freeze' | 'flipThree' | 'secondChance';
  modifierType?: 'add' | 'multiply';
  modifierValue?: number;
}

export interface Player {
  id: string;
  name: string;
  isAI: boolean;
  cards: Card[];
  numberCards: Card[]; // Separate number cards for easier tracking
  modifierCards: Card[]; // Separate modifier cards
  actionCards: Card[]; // Separate action cards
  score: number;
  isActive: boolean;
  hasBusted: boolean;
  hasSecondChance: boolean;
  secondChanceUsedBy?: { 
    type: string; 
    value?: number;
    secondChanceCardId?: string; // ID of the specific Second Chance card that was used
  }; // Info about the card that triggered Second Chance usage
  frozenBy?: string; // ID of player who froze this player
  aiDifficulty?: 'conservative' | 'moderate' | 'aggressive';
}

export interface RoundHistory {
  roundNumber: number;
  playerScores: Record<string, number>; // Scores for each player this round
  playerBusts: Record<string, boolean>; // Whether each player busted this round
  playerCards: Record<string, Card[]>; // Cards each player had at round end
}

export interface LargestRound {
  roundNumber: number;
  playerId: string;
  playerName: string;
  score: number;
  cards: Card[];
}

export interface GameState {
  players: Player[];
  deck: Card[];
  discardPile: Card[];
  currentPlayerIndex: number;
  round: number;
  dealerIndex: number;
  gameStatus: 'waiting' | 'playing' | 'roundEnd' | 'gameEnd';
  roundScores: Record<string, number>; // Scores for current round
  roundHistory: RoundHistory[]; // History of completed rounds
  largestRound?: LargestRound; // Details of the round with highest score
  pendingActionCard?: {
    playerId: string;
    cardId: string;
    actionType: 'freeze' | 'flipThree';
  }; // Action card that must be resolved immediately
}

export type GameAction = 
  | { type: 'HIT' }
  | { type: 'STAY' }
  | { type: 'PLAY_ACTION'; cardId: string; targetPlayerId?: string };

