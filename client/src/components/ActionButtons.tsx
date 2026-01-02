import { useGameStore } from '../stores/gameStore';

interface ActionButtonsProps {
  playerId: string;
  disabled?: boolean;
}

export default function ActionButtons({ playerId, disabled }: ActionButtonsProps) {
  const { hit, stay, loading, gameState } = useGameStore();

  // Check if there's a pending action card that must be resolved first
  const hasPendingActionCard = gameState?.pendingActionCard?.playerId === playerId;

  return (
    <div className="flex gap-2 sm:gap-3 justify-center">
      <button
        onClick={() => hit(playerId)}
        disabled={disabled || loading || hasPendingActionCard}
        className="px-4 sm:px-6 py-2.5 sm:py-3 bg-green-500 text-white rounded-lg font-bold text-sm sm:text-base hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/50 hover:scale-105 active:bg-green-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none transition-all duration-200 min-w-[70px] sm:min-w-[90px] relative overflow-hidden group"
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
        onClick={() => stay(playerId)}
        disabled={disabled || loading || hasPendingActionCard}
        className="px-4 sm:px-6 py-2.5 sm:py-3 bg-red-500 text-white rounded-lg font-bold text-sm sm:text-base hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/50 hover:scale-105 active:bg-red-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none transition-all duration-200 min-w-[70px] sm:min-w-[90px] relative overflow-hidden group"
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

