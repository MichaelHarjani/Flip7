import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Skull, Sparkles, Clock, ChevronRight } from 'lucide-react';
import { useStatsStore, type RecentMatch } from '../stores/statsStore';

interface RecentMatchesProps {
  maxItems?: number;
  onViewAll?: () => void;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function MatchItem({ match, index }: { match: RecentMatch; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`
        flex items-center gap-3 p-3 rounded-lg
        ${match.isWin ? 'bg-green-900/30 border border-green-700/50' : 'bg-red-900/30 border border-red-700/50'}
      `}
    >
      {/* Win/Loss indicator */}
      <div className={`
        flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
        ${match.isWin ? 'bg-green-600' : 'bg-red-600'}
      `}>
        {match.isWin ? (
          <Trophy className="w-5 h-5 text-white" />
        ) : (
          <Skull className="w-5 h-5 text-white" />
        )}
      </div>

      {/* Match details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${match.isWin ? 'text-green-300' : 'text-red-300'}`}>
            {match.isWin ? 'Victory' : 'Defeat'}
          </span>
          {match.flip7Achieved && (
            <span className="flex items-center gap-1 text-xs text-yellow-400">
              <Sparkles className="w-3 h-3" />
              Flip 7
            </span>
          )}
        </div>
        <div className="text-sm text-gray-400 truncate">
          vs {match.opponentName}
        </div>
      </div>

      {/* Scores */}
      <div className="text-right">
        <div className="font-bold text-white">
          {match.playerScore} - {match.opponentScore}
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          {formatRelativeTime(match.completedAt)}
        </div>
      </div>
    </motion.div>
  );
}

export default function RecentMatches({ maxItems = 5, onViewAll }: RecentMatchesProps) {
  const { recentMatches, loading, fetchRecentMatches } = useStatsStore();

  useEffect(() => {
    fetchRecentMatches();
  }, [fetchRecentMatches]);

  const displayedMatches = recentMatches.slice(0, maxItems);

  if (loading && recentMatches.length === 0) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
        <h3 className="text-lg font-bold text-white mb-3">Recent Matches</h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-gray-700/50 h-16 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (recentMatches.length === 0) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
        <h3 className="text-lg font-bold text-white mb-3">Recent Matches</h3>
        <div className="text-center py-6 text-gray-500">
          <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No matches yet</p>
          <p className="text-sm">Play a game to see your history!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-white">Recent Matches</h3>
        {recentMatches.length > maxItems && onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            View all
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {displayedMatches.map((match, index) => (
            <MatchItem key={match.id} match={match} index={index} />
          ))}
        </AnimatePresence>
      </div>

      {/* Quick stats */}
      {recentMatches.length >= 3 && (
        <div className="mt-3 pt-3 border-t border-gray-700 flex justify-around text-center">
          <div>
            <div className="text-lg font-bold text-green-400">
              {recentMatches.filter(m => m.isWin).length}
            </div>
            <div className="text-xs text-gray-500">Wins</div>
          </div>
          <div>
            <div className="text-lg font-bold text-red-400">
              {recentMatches.filter(m => !m.isWin).length}
            </div>
            <div className="text-xs text-gray-500">Losses</div>
          </div>
          <div>
            <div className="text-lg font-bold text-yellow-400">
              {recentMatches.filter(m => m.flip7Achieved).length}
            </div>
            <div className="text-xs text-gray-500">Flip 7s</div>
          </div>
        </div>
      )}
    </div>
  );
}
