import { motion } from 'framer-motion';
import { useAchievementStore, type AchievementDefinition } from '../stores/achievementStore';
import { useStatsStore } from '../stores/statsStore';
import { getAchievementProgress } from '../config/achievements';
import { Lock, Check } from 'lucide-react';

interface AchievementCardProps {
  achievement: AchievementDefinition;
  compact?: boolean;
}

export default function AchievementCard({ achievement, compact = false }: AchievementCardProps) {
  const { getUnlockedTiers } = useAchievementStore();
  const { stats } = useStatsStore();
  const unlockedTiers = getUnlockedTiers();

  const progress = stats
    ? getAchievementProgress(achievement, stats, unlockedTiers)
    : { currentTier: null, nextTier: achievement.tiers[0], progress: 0, maxProgress: achievement.tiers[0].requirement, percentComplete: 0, allComplete: false };

  const tiersUnlocked = achievement.tiers.filter(t => unlockedTiers.includes(t.id)).length;
  const totalTiers = achievement.tiers.length;

  if (compact) {
    return (
      <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{achievement.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold text-sm truncate">{achievement.name}</div>
            <div className="text-gray-400 text-xs">
              {tiersUnlocked}/{totalTiers} tiers
            </div>
          </div>
          <div className="text-right">
            <div className="text-gray-300 text-sm font-mono">
              {progress.progress}/{progress.maxProgress}
            </div>
          </div>
        </div>
        {/* Mini progress bar */}
        <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${progress.allComplete ? 'bg-yellow-500' : 'bg-blue-500'}`}
            initial={{ width: 0 }}
            animate={{ width: `${progress.percentComplete}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 rounded-xl p-4 border-2 ${progress.allComplete ? 'border-yellow-500/50' : 'border-gray-700'}`}>
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className={`text-4xl ${progress.allComplete ? '' : 'grayscale-[30%]'}`}>
          {achievement.icon}
        </div>
        <div className="flex-1">
          <h3 className="text-white font-bold text-lg">{achievement.name}</h3>
          <p className="text-gray-400 text-sm">{achievement.description}</p>
        </div>
        {progress.allComplete && (
          <div className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-semibold rounded-full flex items-center gap-1">
            <Check size={12} />
            Complete
          </div>
        )}
      </div>

      {/* Tiers */}
      <div className="space-y-2">
        {achievement.tiers.map((tier, index) => {
          const isUnlocked = unlockedTiers.includes(tier.id);
          const isCurrent = progress.nextTier?.id === tier.id;

          return (
            <div
              key={tier.id}
              className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                isUnlocked
                  ? 'bg-green-900/30 border border-green-700/50'
                  : isCurrent
                  ? 'bg-blue-900/30 border border-blue-700/50'
                  : 'bg-gray-900/30 border border-gray-700/30'
              }`}
            >
              {/* Tier icon/status */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isUnlocked
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-400'
              }`}>
                {isUnlocked ? (
                  <Check size={16} />
                ) : (
                  <Lock size={14} />
                )}
              </div>

              {/* Tier info */}
              <div className="flex-1 min-w-0">
                <div className={`font-semibold text-sm ${isUnlocked ? 'text-green-300' : 'text-gray-300'}`}>
                  {tier.name}
                </div>
                <div className="text-gray-400 text-xs truncate">{tier.description}</div>
              </div>

              {/* Progress/XP */}
              <div className="text-right">
                {isUnlocked ? (
                  <div className="text-green-400 text-xs">+{tier.xpReward} XP</div>
                ) : isCurrent ? (
                  <div className="text-blue-400 text-sm font-mono">
                    {progress.progress}/{tier.requirement}
                  </div>
                ) : (
                  <div className="text-gray-500 text-xs">{tier.requirement}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall progress bar */}
      {!progress.allComplete && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Progress to next tier</span>
            <span>{Math.round(progress.percentComplete)}%</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-400"
              initial={{ width: 0 }}
              animate={{ width: `${progress.percentComplete}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
