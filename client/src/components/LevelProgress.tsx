import { motion } from 'framer-motion';
import { useAchievementStore, calculateLevel } from '../stores/achievementStore';

interface LevelProgressProps {
  compact?: boolean;
  showXpNumbers?: boolean;
}

export default function LevelProgress({ compact = false, showXpNumbers = true }: LevelProgressProps) {
  const { xp, level } = useAchievementStore();
  const levelInfo = calculateLevel(xp);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-sm shadow-lg">
          {level}
        </div>
        <div className="flex-1 min-w-[60px]">
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${levelInfo.progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-xl shadow-lg border-2 border-blue-400">
            {level}
          </div>
          <div>
            <div className="text-white font-semibold">Level {level}</div>
            {showXpNumbers && (
              <div className="text-gray-400 text-sm">
                {levelInfo.currentXp.toLocaleString()} / {levelInfo.nextLevelXp.toLocaleString()} XP
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-gray-400 text-sm">Total XP</div>
          <div className="text-white font-semibold">{xp.toLocaleString()}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
          initial={{ width: 0 }}
          animate={{ width: `${levelInfo.progress}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      {/* XP to next level */}
      <div className="text-center text-gray-400 text-xs mt-2">
        {(levelInfo.nextLevelXp - levelInfo.currentXp).toLocaleString()} XP to Level {level + 1}
      </div>
    </div>
  );
}
