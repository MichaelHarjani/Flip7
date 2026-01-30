import { motion } from 'framer-motion';
import { ProgressBar } from '../ui';
import { useGameStore } from '../../stores/gameStore';
import { Trophy, Crown } from 'lucide-react';

interface ScoreTrackerProps {
  targetScore?: number;
  showRoundScores?: boolean;
  compact?: boolean;
}

export default function ScoreTracker({
  targetScore = 200,
  showRoundScores = true,
  compact = false,
}: ScoreTrackerProps) {
  const { gameState } = useGameStore();

  if (!gameState?.players) return null;

  // Sort players by score (descending) for display
  const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
  const leadingScore = sortedPlayers[0]?.score || 0;

  // Get color based on position
  const getPlayerColor = (index: number): 'yellow' | 'blue' | 'green' | 'purple' | 'red' => {
    if (index === 0) return 'yellow';
    if (index === 1) return 'blue';
    if (index === 2) return 'green';
    return 'purple';
  };

  return (
    <div className={`w-full ${compact ? 'space-y-1' : 'space-y-3'}`}>
      {sortedPlayers.map((player, index) => {
        const isLeading = player.score === leadingScore && leadingScore > 0;
        const roundScore = gameState.roundScores?.[player.id] || 0;
        const isBusted = player.hasBusted;
        const isActive = player.isActive;

        return (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`
              ${compact ? 'p-1.5' : 'p-3'}
              rounded-lg
              ${isLeading ? 'bg-yellow-900/30 border border-yellow-600/50' : 'bg-gray-800/50'}
              ${isBusted ? 'opacity-50' : ''}
              transition-all
              duration-300
            `}
          >
            {/* Player info row */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                {isLeading && leadingScore > 0 && (
                  <Crown className="w-4 h-4 text-yellow-400" />
                )}
                <span className={`font-semibold ${compact ? 'text-sm' : 'text-base'} ${isLeading ? 'text-yellow-300' : 'text-white'}`}>
                  {player.name}
                </span>
                {player.isAI && (
                  <span className="text-xs text-gray-500">(AI)</span>
                )}
                {!isActive && !isBusted && (
                  <span className="text-xs text-green-400">(Stayed)</span>
                )}
                {isBusted && (
                  <span className="text-xs text-red-400">(Bust!)</span>
                )}
              </div>

              {/* Score display */}
              <div className="flex items-center gap-2">
                {showRoundScores && roundScore > 0 && !isBusted && (
                  <span className={`${compact ? 'text-xs' : 'text-sm'} text-green-400`}>
                    +{roundScore}
                  </span>
                )}
                <span className={`font-bold ${compact ? 'text-base' : 'text-lg'} ${isLeading ? 'text-yellow-300' : 'text-white'}`}>
                  {player.score}
                </span>
                {player.score >= targetScore && (
                  <Trophy className="w-4 h-4 text-yellow-400" />
                )}
              </div>
            </div>

            {/* Progress bar */}
            <ProgressBar
              current={player.score}
              target={targetScore}
              color={getPlayerColor(index)}
              size={compact ? 'sm' : 'md'}
              showValue={false}
              showPercentage={false}
              milestones={compact ? [] : [100, 150, 200]}
              animated
            />
          </motion.div>
        );
      })}
    </div>
  );
}
