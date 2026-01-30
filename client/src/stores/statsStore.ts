import { create } from 'zustand';
import { useAuthStore } from './authStore';

// Types matching server types
export type GameMode = 'single' | 'local' | 'online' | 'ranked';

export interface MatchParticipant {
  id: string;
  name: string;
  score: number;
  userId?: string | null;
  isAI: boolean;
  flip7Count: number;
  bustCount: number;
  roundScores: number[];
}

export interface MatchResult {
  id?: string;
  gameId: string;
  gameMode: GameMode;
  winnerId: string;
  winnerName: string;
  winnerScore: number;
  winnerUserId?: string | null;
  totalRounds: number;
  targetScore: number;
  durationSeconds?: number;
  participants: MatchParticipant[];
  startedAt?: string;
  completedAt: string;
}

export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  totalScore: number;
  highestScore: number;
  highestRoundScore: number;
  flip7Count: number;
  bustCount: number;
  currentWinStreak: number;
  bestWinStreak: number;
}

export interface RecentMatch {
  id: string;
  gameMode: GameMode;
  isWin: boolean;
  playerScore: number;
  opponentName: string;
  opponentScore: number;
  flip7Achieved: boolean;
  completedAt: string;
}

interface StatsStore {
  stats: PlayerStats | null;
  recentMatches: RecentMatch[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchStats: () => Promise<void>;
  fetchRecentMatches: () => Promise<void>;
  recordMatch: (match: Omit<MatchResult, 'id' | 'completedAt'>) => Promise<void>;
  clearError: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const STORAGE_KEY_STATS = 'flip7_guest_stats';
const STORAGE_KEY_MATCHES = 'flip7_guest_matches';

// Default empty stats
const defaultStats: PlayerStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  gamesLost: 0,
  totalScore: 0,
  highestScore: 0,
  highestRoundScore: 0,
  flip7Count: 0,
  bustCount: 0,
  currentWinStreak: 0,
  bestWinStreak: 0,
};

// Get stored guest stats from localStorage
function getGuestStats(): PlayerStats {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_STATS);
    if (stored) {
      return { ...defaultStats, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return defaultStats;
}

// Save guest stats to localStorage
function saveGuestStats(stats: PlayerStats): void {
  try {
    localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
  } catch {
    // Ignore storage errors
  }
}

// Get stored guest matches from localStorage
function getGuestMatches(): RecentMatch[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_MATCHES);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

// Save guest matches to localStorage
function saveGuestMatches(matches: RecentMatch[]): void {
  try {
    // Keep only last 20 matches
    const trimmed = matches.slice(0, 20);
    localStorage.setItem(STORAGE_KEY_MATCHES, JSON.stringify(trimmed));
  } catch {
    // Ignore storage errors
  }
}

export const useStatsStore = create<StatsStore>((set, get) => ({
  stats: null,
  recentMatches: [],
  loading: false,
  error: null,

  fetchStats: async () => {
    const { user, isGuest } = useAuthStore.getState();

    set({ loading: true, error: null });

    // If guest, use localStorage
    if (isGuest || !user) {
      const stats = getGuestStats();
      set({ stats, loading: false });
      return;
    }

    // Fetch from API for authenticated users
    try {
      const response = await fetch(`${API_URL}/api/matches/stats`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      set({ stats: data.stats, loading: false });
    } catch (error) {
      console.error('[StatsStore] Error fetching stats:', error);
      // Fall back to guest stats
      const stats = getGuestStats();
      set({ stats, loading: false, error: 'Failed to fetch stats from server' });
    }
  },

  fetchRecentMatches: async () => {
    const { user, isGuest } = useAuthStore.getState();

    set({ loading: true, error: null });

    // If guest, use localStorage
    if (isGuest || !user) {
      const matches = getGuestMatches();
      set({ recentMatches: matches, loading: false });
      return;
    }

    // Fetch from API for authenticated users
    try {
      const response = await fetch(`${API_URL}/api/matches/recent?limit=10`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recent matches');
      }

      const data = await response.json();
      set({ recentMatches: data.matches, loading: false });
    } catch (error) {
      console.error('[StatsStore] Error fetching recent matches:', error);
      // Fall back to guest matches
      const matches = getGuestMatches();
      set({ recentMatches: matches, loading: false, error: 'Failed to fetch matches from server' });
    }
  },

  recordMatch: async (matchData) => {
    const { user, isGuest } = useAuthStore.getState();

    const match: MatchResult = {
      ...matchData,
      completedAt: new Date().toISOString(),
    };

    // Find the player (non-AI human)
    const humanParticipant = match.participants.find(p => !p.isAI && p.userId === user?.id)
      || match.participants.find(p => !p.isAI);

    if (!humanParticipant) {
      console.warn('[StatsStore] No human participant found in match');
      return;
    }

    const isWin = match.winnerId === humanParticipant.id;
    const opponent = match.participants.find(p => p.id !== humanParticipant.id);

    // Create recent match entry
    const recentMatch: RecentMatch = {
      id: `local-${Date.now()}`,
      gameMode: match.gameMode,
      isWin,
      playerScore: humanParticipant.score,
      opponentName: opponent?.name || 'Unknown',
      opponentScore: opponent?.score || 0,
      flip7Achieved: humanParticipant.flip7Count > 0,
      completedAt: match.completedAt,
    };

    // Update local state immediately
    const currentStats = get().stats || defaultStats;
    const updatedStats: PlayerStats = {
      gamesPlayed: currentStats.gamesPlayed + 1,
      gamesWon: currentStats.gamesWon + (isWin ? 1 : 0),
      gamesLost: currentStats.gamesLost + (isWin ? 0 : 1),
      totalScore: currentStats.totalScore + humanParticipant.score,
      highestScore: Math.max(currentStats.highestScore, humanParticipant.score),
      highestRoundScore: Math.max(
        currentStats.highestRoundScore,
        Math.max(...humanParticipant.roundScores, 0)
      ),
      flip7Count: currentStats.flip7Count + humanParticipant.flip7Count,
      bustCount: currentStats.bustCount + humanParticipant.bustCount,
      currentWinStreak: isWin ? currentStats.currentWinStreak + 1 : 0,
      bestWinStreak: isWin
        ? Math.max(currentStats.bestWinStreak, currentStats.currentWinStreak + 1)
        : currentStats.bestWinStreak,
    };

    const currentMatches = get().recentMatches;
    const updatedMatches = [recentMatch, ...currentMatches].slice(0, 20);

    set({ stats: updatedStats, recentMatches: updatedMatches });

    // If guest, save to localStorage
    if (isGuest || !user) {
      saveGuestStats(updatedStats);
      saveGuestMatches(updatedMatches);
      return;
    }

    // For authenticated users, also send to server
    try {
      const response = await fetch(`${API_URL}/api/matches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(match),
      });

      if (!response.ok) {
        console.error('[StatsStore] Failed to record match on server');
      }
    } catch (error) {
      console.error('[StatsStore] Error recording match:', error);
      // Stats already updated locally, so user sees the update
    }
  },

  clearError: () => set({ error: null }),
}));
