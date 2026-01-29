import { useState, useRef, useCallback } from 'react';
import { useGameStore } from '../stores/gameStore';
import { playSound } from '../utils/sounds';

interface ActionButtonsProps {
  playerId: string;
  disabled?: boolean;
}

// Minimum delay between button presses (ms)
const DEBOUNCE_MS = 300;

export default function ActionButtons({ playerId, disabled }: ActionButtonsProps) {
  const { hit, stay, loading, gameState } = useGameStore();
  const [localProcessing, setLocalProcessing] = useState(false);
  const lastClickRef = useRef<number>(0);

  // Check if there's a pending action card that must be resolved first
  const hasPendingActionCard = gameState?.pendingActionCard?.playerId === playerId;

  // Double-tap prevention wrapper
  const withDebounce = useCallback((fn: () => Promise<void> | void) => {
    return async () => {
      const now = Date.now();
      if (now - lastClickRef.current < DEBOUNCE_MS) {
        return; // Ignore rapid clicks
      }
      lastClickRef.current = now;
      setLocalProcessing(true);
      try {
        await fn();
      } finally {
        // Add small delay before allowing next action
        setTimeout(() => setLocalProcessing(false), DEBOUNCE_MS);
      }
    };
  }, []);

  const handleHit = withDebounce(() => {
    playSound('cardDraw');
    return hit(playerId);
  });

  const handleStay = withDebounce(() => {
    playSound('click');
    return stay(playerId);
  });

  const isDisabled = disabled || loading || localProcessing || hasPendingActionCard;

  return (
    <div className="flex gap-1.5 sm:gap-2 md:gap-3 justify-center">
      <button
        onClick={handleHit}
        disabled={isDisabled}
        className="px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 bg-green-500 text-white rounded-lg font-bold text-xs sm:text-sm md:text-base hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/50 hover:scale-105 active:bg-green-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none transition-all duration-200 min-w-[60px] sm:min-w-[70px] md:min-w-[90px] relative overflow-hidden group"
      >
        <span className="relative z-10 flex items-center justify-center gap-1">
          {loading ? (
            <>
              <span className="animate-spin">⟳</span>
              <span>Hit</span>
            </>
          ) : (
            <>
              <span>🎴</span>
              <span>Hit</span>
            </>
          )}
        </span>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
      </button>
      <button
        onClick={handleStay}
        disabled={isDisabled}
        className="px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 bg-red-500 text-white rounded-lg font-bold text-xs sm:text-sm md:text-base hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/50 hover:scale-105 active:bg-red-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none transition-all duration-200 min-w-[60px] sm:min-w-[70px] md:min-w-[90px] relative overflow-hidden group"
      >
        <span className="relative z-10 flex items-center justify-center gap-1">
          {loading ? (
            <>
              <span className="animate-spin">⟳</span>
              <span>Stay</span>
            </>
          ) : (
            <>
              <span>✋</span>
              <span>Stay</span>
            </>
          )}
        </span>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
      </button>
    </div>
  );
}

