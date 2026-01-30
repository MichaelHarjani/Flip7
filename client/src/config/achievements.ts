// Achievement system configuration

export type AchievementCategory = 'wins' | 'flip7' | 'games' | 'streaks' | 'scores' | 'special';

export interface AchievementTier {
  id: string;
  name: string;
  description: string;
  requirement: number;
  xpReward: number;
  icon: string;
}

export interface AchievementDefinition {
  id: string;
  category: AchievementCategory;
  name: string;
  description: string;
  icon: string;
  tiers: AchievementTier[];
  // Function to check current progress given stats
  getProgress: (stats: AchievementStats) => number;
}

// Stats needed to check achievement progress
export interface AchievementStats {
  gamesPlayed: number;
  gamesWon: number;
  flip7Count: number;
  bustCount: number;
  currentWinStreak: number;
  bestWinStreak: number;
  highestScore: number;
  highestRoundScore: number;
  totalScore: number;
  // Game-specific stats (from current game)
  currentGameFlip7s?: number;
  currentGameScore?: number;
  currentGameRoundScore?: number;
  wonWithoutBusting?: boolean;
  comebackWin?: boolean; // Won after trailing by 100+
  perfectRound?: boolean; // 77 points in a round
}

export interface UnlockedAchievement {
  achievementId: string;
  odtierId: string;
  unlockedAt: string;
  progress: number;
}

// XP and Level configuration
export const XP_CONFIG = {
  // XP rewards
  GAME_PLAYED: 25,
  GAME_WON: 50,
  FLIP7_ACHIEVED: 30,
  DAILY_LOGIN: 15,
  WIN_STREAK_BONUS: 10, // Per win in streak

  // Level thresholds (cumulative XP needed)
  LEVELS: [
    0,      // Level 1
    100,    // Level 2
    250,    // Level 3
    450,    // Level 4
    700,    // Level 5
    1000,   // Level 6
    1350,   // Level 7
    1750,   // Level 8
    2200,   // Level 9
    2700,   // Level 10
    3250,   // Level 11
    3850,   // Level 12
    4500,   // Level 13
    5200,   // Level 14
    6000,   // Level 15
    6900,   // Level 16
    7900,   // Level 17
    9000,   // Level 18
    10200,  // Level 19
    11500,  // Level 20
    13000,  // Level 21
    14700,  // Level 22
    16600,  // Level 23
    18700,  // Level 24
    21000,  // Level 25
    // Beyond level 25, each level needs +2500 more
  ],
};

// Calculate level from XP
export function calculateLevel(xp: number): { level: number; currentXp: number; nextLevelXp: number; progress: number } {
  const levels = XP_CONFIG.LEVELS;

  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i]) {
      const currentLevelXp = levels[i];
      const nextLevelXp = i < levels.length - 1 ? levels[i + 1] : levels[i] + 2500;
      const xpIntoLevel = xp - currentLevelXp;
      const xpNeededForNext = nextLevelXp - currentLevelXp;

      return {
        level: i + 1,
        currentXp: xpIntoLevel,
        nextLevelXp: xpNeededForNext,
        progress: (xpIntoLevel / xpNeededForNext) * 100,
      };
    }
  }

  return { level: 1, currentXp: xp, nextLevelXp: XP_CONFIG.LEVELS[1], progress: (xp / XP_CONFIG.LEVELS[1]) * 100 };
}

// Calculate XP earned from a game
export function calculateGameXp(won: boolean, flip7Count: number, winStreak: number): number {
  let xp = XP_CONFIG.GAME_PLAYED;

  if (won) {
    xp += XP_CONFIG.GAME_WON;
    xp += Math.min(winStreak, 10) * XP_CONFIG.WIN_STREAK_BONUS; // Cap at 10x streak bonus
  }

  xp += flip7Count * XP_CONFIG.FLIP7_ACHIEVED;

  return xp;
}

// Achievement definitions
export const ACHIEVEMENTS: AchievementDefinition[] = [
  // Wins category
  {
    id: 'wins',
    category: 'wins',
    name: 'Winner',
    description: 'Win games',
    icon: '🏆',
    tiers: [
      { id: 'wins_1', name: 'First Victory', description: 'Win your first game', requirement: 1, xpReward: 50, icon: '🏆' },
      { id: 'wins_10', name: 'Getting Started', description: 'Win 10 games', requirement: 10, xpReward: 100, icon: '🏆' },
      { id: 'wins_25', name: 'Competitor', description: 'Win 25 games', requirement: 25, xpReward: 200, icon: '🏆' },
      { id: 'wins_50', name: 'Champion', description: 'Win 50 games', requirement: 50, xpReward: 400, icon: '👑' },
      { id: 'wins_100', name: 'Legend', description: 'Win 100 games', requirement: 100, xpReward: 800, icon: '👑' },
    ],
    getProgress: (stats) => stats.gamesWon,
  },

  // Flip 7 category
  {
    id: 'flip7',
    category: 'flip7',
    name: 'Flip 7 Master',
    description: 'Achieve Flip 7',
    icon: '7️⃣',
    tiers: [
      { id: 'flip7_1', name: 'Lucky Seven', description: 'Get your first Flip 7', requirement: 1, xpReward: 75, icon: '7️⃣' },
      { id: 'flip7_5', name: 'Seven Heaven', description: 'Get 5 Flip 7s', requirement: 5, xpReward: 150, icon: '7️⃣' },
      { id: 'flip7_15', name: 'Card Counter', description: 'Get 15 Flip 7s', requirement: 15, xpReward: 300, icon: '🃏' },
      { id: 'flip7_30', name: 'Risk Taker', description: 'Get 30 Flip 7s', requirement: 30, xpReward: 500, icon: '🃏' },
      { id: 'flip7_50', name: 'Flip 7 Legend', description: 'Get 50 Flip 7s', requirement: 50, xpReward: 1000, icon: '⭐' },
    ],
    getProgress: (stats) => stats.flip7Count,
  },

  // Games played category
  {
    id: 'games',
    category: 'games',
    name: 'Dedicated Player',
    description: 'Play games',
    icon: '🎮',
    tiers: [
      { id: 'games_5', name: 'Rookie', description: 'Play 5 games', requirement: 5, xpReward: 50, icon: '🎮' },
      { id: 'games_25', name: 'Regular', description: 'Play 25 games', requirement: 25, xpReward: 100, icon: '🎮' },
      { id: 'games_50', name: 'Enthusiast', description: 'Play 50 games', requirement: 50, xpReward: 200, icon: '🎲' },
      { id: 'games_100', name: 'Veteran', description: 'Play 100 games', requirement: 100, xpReward: 400, icon: '🎲' },
      { id: 'games_250', name: 'Addict', description: 'Play 250 games', requirement: 250, xpReward: 800, icon: '💎' },
    ],
    getProgress: (stats) => stats.gamesPlayed,
  },

  // Win streak category
  {
    id: 'streaks',
    category: 'streaks',
    name: 'Hot Streak',
    description: 'Win consecutive games',
    icon: '🔥',
    tiers: [
      { id: 'streak_3', name: 'On a Roll', description: 'Win 3 games in a row', requirement: 3, xpReward: 100, icon: '🔥' },
      { id: 'streak_5', name: 'Hot Streak', description: 'Win 5 games in a row', requirement: 5, xpReward: 250, icon: '🔥' },
      { id: 'streak_7', name: 'Unstoppable', description: 'Win 7 games in a row', requirement: 7, xpReward: 500, icon: '💪' },
      { id: 'streak_10', name: 'Dominator', description: 'Win 10 games in a row', requirement: 10, xpReward: 1000, icon: '⚡' },
    ],
    getProgress: (stats) => stats.bestWinStreak,
  },

  // High scores category
  {
    id: 'scores',
    category: 'scores',
    name: 'High Scorer',
    description: 'Achieve high scores',
    icon: '📊',
    tiers: [
      { id: 'score_250', name: 'Solid Score', description: 'Score 250+ points in a game', requirement: 250, xpReward: 75, icon: '📊' },
      { id: 'score_300', name: 'Big Score', description: 'Score 300+ points in a game', requirement: 300, xpReward: 150, icon: '📊' },
      { id: 'score_350', name: 'Huge Score', description: 'Score 350+ points in a game', requirement: 350, xpReward: 300, icon: '📈' },
      { id: 'score_400', name: 'Massive Score', description: 'Score 400+ points in a game', requirement: 400, xpReward: 500, icon: '🚀' },
    ],
    getProgress: (stats) => stats.highestScore,
  },

  // Special achievements
  {
    id: 'round_score',
    category: 'special',
    name: 'Round Master',
    description: 'Score high in a single round',
    icon: '💯',
    tiers: [
      { id: 'round_50', name: 'Good Round', description: 'Score 50+ in a single round', requirement: 50, xpReward: 50, icon: '💯' },
      { id: 'round_60', name: 'Great Round', description: 'Score 60+ in a single round', requirement: 60, xpReward: 100, icon: '💯' },
      { id: 'round_70', name: 'Amazing Round', description: 'Score 70+ in a single round', requirement: 70, xpReward: 200, icon: '🌟' },
      { id: 'round_77', name: 'Perfect Seven', description: 'Score exactly 77 in a round', requirement: 77, xpReward: 500, icon: '✨' },
    ],
    getProgress: (stats) => stats.highestRoundScore,
  },
];

// Get achievement by ID
export function getAchievement(id: string): AchievementDefinition | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}

// Get all achievements in a category
export function getAchievementsByCategory(category: AchievementCategory): AchievementDefinition[] {
  return ACHIEVEMENTS.filter(a => a.category === category);
}

// Check which achievements/tiers are newly unlocked
export function checkNewUnlocks(
  stats: AchievementStats,
  currentUnlocks: UnlockedAchievement[]
): { achievement: AchievementDefinition; tier: AchievementTier; xpEarned: number }[] {
  const newUnlocks: { achievement: AchievementDefinition; tier: AchievementTier; xpEarned: number }[] = [];
  const unlockedTierIds = new Set(currentUnlocks.map(u => u.odtierId));

  for (const achievement of ACHIEVEMENTS) {
    const progress = achievement.getProgress(stats);

    for (const tier of achievement.tiers) {
      // Skip already unlocked
      if (unlockedTierIds.has(tier.id)) continue;

      // Check if newly unlocked
      if (progress >= tier.requirement) {
        newUnlocks.push({
          achievement,
          tier,
          xpEarned: tier.xpReward,
        });
      }
    }
  }

  return newUnlocks;
}

// Get display info for achievement progress
export function getAchievementProgress(achievement: AchievementDefinition, stats: AchievementStats, unlockedTiers: string[]): {
  currentTier: AchievementTier | null;
  nextTier: AchievementTier | null;
  progress: number;
  maxProgress: number;
  percentComplete: number;
  allComplete: boolean;
} {
  const currentProgress = achievement.getProgress(stats);

  // Find the highest unlocked tier and the next tier to unlock
  let currentTier: AchievementTier | null = null;
  let nextTier: AchievementTier | null = null;

  for (const tier of achievement.tiers) {
    if (unlockedTiers.includes(tier.id)) {
      currentTier = tier;
    } else if (!nextTier) {
      nextTier = tier;
    }
  }

  const allComplete = !nextTier;
  const maxProgress = nextTier?.requirement || currentTier?.requirement || achievement.tiers[0].requirement;
  const percentComplete = allComplete ? 100 : Math.min((currentProgress / maxProgress) * 100, 100);

  return {
    currentTier,
    nextTier,
    progress: currentProgress,
    maxProgress,
    percentComplete,
    allComplete,
  };
}
