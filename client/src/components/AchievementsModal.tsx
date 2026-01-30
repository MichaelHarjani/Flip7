import { useEffect } from 'react';
import { Modal } from './ui';
import { useAchievementStore, ACHIEVEMENTS } from '../stores/achievementStore';
import { useStatsStore } from '../stores/statsStore';
import AchievementCard from './AchievementCard';
import LevelProgress from './LevelProgress';
import { Trophy } from 'lucide-react';

interface AchievementsModalProps {
  onClose: () => void;
}

export default function AchievementsModal({ onClose }: AchievementsModalProps) {
  const { fetchAchievements, getUnlockedTiers } = useAchievementStore();
  const { fetchStats } = useStatsStore();

  useEffect(() => {
    fetchAchievements();
    fetchStats();
  }, [fetchAchievements, fetchStats]);

  const unlockedTiers = getUnlockedTiers();
  const totalTiers = ACHIEVEMENTS.reduce((sum, a) => sum + a.tiers.length, 0);
  const unlockedCount = unlockedTiers.length;

  return (
    <Modal isOpen={true} onClose={onClose} title="Achievements" size="lg">
      <div className="space-y-6">
        {/* Level Progress */}
        <LevelProgress />

        {/* Achievement Summary */}
        <div className="flex items-center justify-between bg-gray-900 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <div>
              <div className="text-white font-bold">Achievement Progress</div>
              <div className="text-gray-400 text-sm">
                {unlockedCount} of {totalTiers} tiers unlocked
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-yellow-400">
              {Math.round((unlockedCount / totalTiers) * 100)}%
            </div>
            <div className="text-gray-400 text-xs">Complete</div>
          </div>
        </div>

        {/* Achievement List */}
        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
          {ACHIEVEMENTS.map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))}
        </div>
      </div>
    </Modal>
  );
}
