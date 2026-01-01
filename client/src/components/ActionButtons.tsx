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
        className="px-4 sm:px-6 py-2.5 sm:py-3 bg-green-500 text-white rounded-lg font-bold text-sm sm:text-base hover:bg-green-600 active:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[70px] sm:min-w-[90px]"
      >
        Hit
      </button>
      <button
        onClick={() => stay(playerId)}
        disabled={disabled || loading || hasPendingActionCard}
        className="px-4 sm:px-6 py-2.5 sm:py-3 bg-red-500 text-white rounded-lg font-bold text-sm sm:text-base hover:bg-red-600 active:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[70px] sm:min-w-[90px]"
      >
        Stay
      </button>
    </div>
  );
}

