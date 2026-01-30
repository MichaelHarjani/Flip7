import { useState, useRef, useCallback } from 'react';
import { useGameStore } from '../stores/gameStore';
import { playSound } from '../utils/sounds';
import { Button } from './ui';

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
    <div className="flex gap-2 sm:gap-3 justify-center">
      <Button
        variant="success"
        size="lg"
        onClick={handleHit}
        disabled={isDisabled}
        loading={loading}
        shortcut="H"
        className="min-w-[100px] sm:min-w-[120px]"
      >
        <span className="mr-1">🎴</span>
        Hit
      </Button>
      <Button
        variant="danger"
        size="lg"
        onClick={handleStay}
        disabled={isDisabled}
        loading={loading}
        shortcut="S"
        className="min-w-[100px] sm:min-w-[120px]"
      >
        <span className="mr-1">✋</span>
        Stay
      </Button>
    </div>
  );
}
