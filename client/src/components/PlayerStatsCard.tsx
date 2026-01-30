import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  Target,
  Flame,
  Sparkles,
  TrendingUp,
  Award,
  BarChart3
} from 'lucide-react';
import { useStatsStore } from '../stores/statsStore';
import { ProgressBar } from './ui';

interface PlayerStatsCardProps {
  compact?: boolean;
}

export default function PlayerStatsCard({ compact = false }: PlayerStatsCardProps) {
  const { stats, loading, fetchStats } = useStatsStore();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading && !stats) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
        <h3 className="text-lg font-bold text-white mb-3">Your Stats</h3>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-700/50 rounded w-3/4" />
          <div className="h-4 bg-gray-700/50 rounded w-1/2" />
          <div className="h-4 bg-gray-700/50 rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (!stats || stats.gamesPlayed === 0) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
        <h3 className="text-lg font-bold text-white mb-3">Your Stats</h3>
        <div className="text-center py-6 text-gray-500">
          <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No stats yet</p>
          <p className="text-sm">Complete a game to start tracking!</p>
        </div>
      </div>
    );
  }

  const winRate = stats.gamesPlayed > 0
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
    : 0;

  const avgScore = stats.gamesPlayed > 0
    ? Math.round(stats.totalScore / stats.gamesPlayed)
    : 0;

  if (compact) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
        <h3 className="text-lg font-bold text-white mb-3">Your Stats</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-2xl font-bold text-green-400">{stats.gamesWon}</div>
            <div className="text-xs text-gray-500">Wins</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-400">{winRate}%</div>
            <div className="text-xs text-gray-500">Win Rate</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-400">{stats.flip7Count}</div>
            <div className="text-xs text-gray-500">Flip 7s</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
      <h3 className="text-lg font-bold text-white mb-4">Your Stats</h3>

      {/* Win rate progress bar */}
      <div className="mb-4">
        <ProgressBar
          current={stats.gamesWon}
          target={stats.gamesPlayed}
          label="Win Rate"
          color="green"
          showPercentage
          milestones={[]}
          animated
        />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Games Won */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-green-900/30 border border-green-700/50 rounded-lg p-3"
        >
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-400">Wins</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.gamesWon}</div>
        </motion.div>

        {/* Games Played */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-3"
        >
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-400">Played</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.gamesPlayed}</div>
        </motion.div>

        {/* Win Streak */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-orange-900/30 border border-orange-700/50 rounded-lg p-3"
        >
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-xs text-gray-400">Win Streak</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {stats.currentWinStreak}
            {stats.bestWinStreak > stats.currentWinStreak && (
              <span className="text-sm text-gray-500 ml-1">(best: {stats.bestWinStreak})</span>
            )}
          </div>
        </motion.div>

        {/* Flip 7s */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-3"
        >
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-gray-400">Flip 7s</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.flip7Count}</div>
        </motion.div>

        {/* Highest Score */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-purple-900/30 border border-purple-700/50 rounded-lg p-3"
        >
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-400">Best Game</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.highestScore}</div>
        </motion.div>

        {/* Average Score */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-cyan-900/30 border border-cyan-700/50 rounded-lg p-3"
        >
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-gray-400">Avg Score</span>
          </div>
          <div className="text-2xl font-bold text-white">{avgScore}</div>
        </motion.div>
      </div>

      {/* Additional stats */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Total Points Scored</span>
          <span className="text-white font-medium">{stats.totalScore.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-gray-500">Best Round Score</span>
          <span className="text-white font-medium">{stats.highestRoundScore}</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-gray-500">Times Busted</span>
          <span className="text-red-400 font-medium">{stats.bustCount}</span>
        </div>
      </div>
    </div>
  );
}
