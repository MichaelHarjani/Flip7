import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { useStatsStore } from './statsStore';
import {
  ACHIEVEMENTS,
  AchievementDefinition,
  AchievementTier,
  UnlockedAchievement,
  AchievementStats,
  checkNewUnlocks,
  calculateLevel,
  calculateGameXp,
  XP_CONFIG,
} from '../config/achievements';

interface AchievementStore {
  // State
  unlockedAchievements: UnlockedAchievement[];
  xp: number;
  level: number;
  loading: boolean;
  error: string | null;

  // Pending notifications (achievements to show to user)
  pendingNotifications: { achievement: AchievementDefinition; tier: AchievementTier; xpEarned: number }[];

  // Actions
  fetchAchievements: () => Promise<void>;
  checkAndUnlockAchievements: (stats: AchievementStats) => void;
  processGameEnd: (won: boolean, flip7Count: number, winStreak: number) => { xpEarned: number; leveledUp: boolean; newLevel: number };
  dismissNotification: () => void;
  clearAllNotifications: () => void;

  // Helpers
  isUnlocked: (tierId: string) => boolean;
  getUnlockedTiers: () => string[];
}

const STORAGE_KEY_ACHIEVEMENTS = 'flip7_guest_achievements';
const STORAGE_KEY_XP = 'flip7_guest_xp';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

// Get stored guest achievements
function getGuestAchievements(): UnlockedAchievement[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_ACHIEVEMENTS);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore
  }
  return [];
}

// Save guest achievements
function saveGuestAchievements(achievements: UnlockedAchievement[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACHIEVEMENTS, JSON.stringify(achievements));
  } catch {
    // Ignore
  }
}

// Get stored guest XP
function getGuestXp(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_XP);
    if (stored) {
      return parseInt(stored, 10) || 0;
    }
  } catch {
    // Ignore
  }
  return 0;
}

// Save guest XP
function saveGuestXp(xp: number): void {
  try {
    localStorage.setItem(STORAGE_KEY_XP, xp.toString());
  } catch {
    // Ignore
  }
}

export const useAchievementStore = create<AchievementStore>((set, get) => ({
  unlockedAchievements: [],
  xp: 0,
  level: 1,
  loading: false,
  error: null,
  pendingNotifications: [],

  fetchAchievements: async () => {
    const { user, isGuest } = useAuthStore.getState();

    set({ loading: true, error: null });

    // If guest, use localStorage
    if (isGuest || !user) {
      const achievements = getGuestAchievements();
      const xp = getGuestXp();
      const { level } = calculateLevel(xp);
      set({ unlockedAchievements: achievements, xp, level, loading: false });
      return;
    }

    // Fetch from API for authenticated users
    try {
      const response = await fetch(`${API_URL}/api/achievements`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch achievements');
      }

      const data = await response.json();
      const { level } = calculateLevel(data.xp || 0);
      set({
        unlockedAchievements: data.achievements || [],
        xp: data.xp || 0,
        level,
        loading: false,
      });
    } catch (error) {
      console.error('[AchievementStore] Error fetching achievements:', error);
      // Fall back to guest data
      const achievements = getGuestAchievements();
      const xp = getGuestXp();
      const { level } = calculateLevel(xp);
      set({ unlockedAchievements: achievements, xp, level, loading: false, error: 'Failed to fetch achievements' });
    }
  },

  checkAndUnlockAchievements: (stats: AchievementStats) => {
    const { unlockedAchievements, xp } = get();
    const { user, isGuest } = useAuthStore.getState();

    // Check for new unlocks
    const newUnlocks = checkNewUnlocks(stats, unlockedAchievements);

    if (newUnlocks.length === 0) return;

    // Calculate total XP from achievements
    const achievementXp = newUnlocks.reduce((sum, u) => sum + u.xpEarned, 0);
    const newXp = xp + achievementXp;
    const { level: newLevel } = calculateLevel(newXp);

    // Create unlock records
    const newAchievementRecords: UnlockedAchievement[] = newUnlocks.map(u => ({
      achievementId: u.achievement.id,
      odtierId: u.tier.id,
      unlockedAt: new Date().toISOString(),
      progress: u.tier.requirement,
    }));

    // Update state
    const updatedAchievements = [...unlockedAchievements, ...newAchievementRecords];

    set({
      unlockedAchievements: updatedAchievements,
      xp: newXp,
      level: newLevel,
      pendingNotifications: [...get().pendingNotifications, ...newUnlocks],
    });

    // Save to localStorage for guests
    if (isGuest || !user) {
      saveGuestAchievements(updatedAchievements);
      saveGuestXp(newXp);
      return;
    }

    // Send to server for authenticated users
    for (const unlock of newUnlocks) {
      fetch(`${API_URL}/api/achievements/unlock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          achievementId: unlock.achievement.id,
          tierId: unlock.tier.id,
          progress: unlock.tier.requirement,
        }),
      }).catch(err => console.error('[AchievementStore] Failed to sync achievement:', err));
    }
  },

  processGameEnd: (won: boolean, flip7Count: number, winStreak: number) => {
    const { xp, level } = get();
    const { user, isGuest } = useAuthStore.getState();

    // Calculate XP earned
    const xpEarned = calculateGameXp(won, flip7Count, winStreak);
    const newXp = xp + xpEarned;
    const newLevelInfo = calculateLevel(newXp);
    const leveledUp = newLevelInfo.level > level;

    // Update state
    set({
      xp: newXp,
      level: newLevelInfo.level,
    });

    // Save for guests
    if (isGuest || !user) {
      saveGuestXp(newXp);
    }

    // Check achievements based on updated stats
    const stats = useStatsStore.getState().stats;
    if (stats) {
      get().checkAndUnlockAchievements({
        ...stats,
        currentWinStreak: winStreak,
      });
    }

    return { xpEarned, leveledUp, newLevel: newLevelInfo.level };
  },

  dismissNotification: () => {
    const { pendingNotifications } = get();
    if (pendingNotifications.length > 0) {
      set({ pendingNotifications: pendingNotifications.slice(1) });
    }
  },

  clearAllNotifications: () => {
    set({ pendingNotifications: [] });
  },

  isUnlocked: (tierId: string) => {
    return get().unlockedAchievements.some(a => a.odtierId === tierId);
  },

  getUnlockedTiers: () => {
    return get().unlockedAchievements.map(a => a.odtierId);
  },
}));

// Export level calculation for use in components
export { calculateLevel, XP_CONFIG, ACHIEVEMENTS };
export type { AchievementDefinition, AchievementTier, AchievementStats };
