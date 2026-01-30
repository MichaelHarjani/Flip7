import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAchievementStore } from '../stores/achievementStore';
import { playSound } from '../utils/sounds';

export default function AchievementNotification() {
  const { pendingNotifications, dismissNotification } = useAchievementStore();
  const notification = pendingNotifications[0];

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (notification) {
      playSound('flip7'); // Reuse the celebratory sound
      const timer = setTimeout(() => {
        dismissNotification();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification, dismissNotification]);

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ y: -100, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -100, opacity: 0, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] pointer-events-auto"
          onClick={dismissNotification}
        >
          <div className="bg-gradient-to-r from-yellow-900 via-yellow-700 to-yellow-900 border-4 border-yellow-400 rounded-2xl shadow-2xl p-4 min-w-[300px] max-w-[400px] cursor-pointer hover:scale-105 transition-transform">
            {/* Shimmer effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-yellow-300/20 to-transparent animate-shimmer overflow-hidden" />

            <div className="relative flex items-center gap-4">
              {/* Icon */}
              <div className="text-5xl animate-bounce-soft">
                {notification.tier.icon}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="text-yellow-300 text-xs font-semibold uppercase tracking-wide mb-1">
                  Achievement Unlocked!
                </div>
                <div className="text-white font-bold text-lg">
                  {notification.tier.name}
                </div>
                <div className="text-yellow-200 text-sm">
                  {notification.tier.description}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-yellow-400 text-sm font-semibold">
                    +{notification.xpEarned} XP
                  </span>
                </div>
              </div>
            </div>

            {/* Click to dismiss hint */}
            <div className="text-center text-yellow-400/60 text-xs mt-2">
              Click to dismiss
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
