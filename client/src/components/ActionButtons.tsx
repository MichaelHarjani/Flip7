import { useState, useRef, useCallback } from 'react';
import { useGameStore } from '../stores/gameStore';
import { playSound } from '../utils/sounds';
import { Button } from './ui';
import { KeyBinding } from '../config/keyBindings';

interface ActionButtonsProps {
  playerId: string;
  disabled?: boolean;
  bindings?: KeyBinding;
}

// Minimum delay between button presses (ms)
const DEBOUNCE_MS = 300;

export default function ActionButtons({ playerId, disabled, bindings }: ActionButtonsProps) {
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
    <div className="flex gap-3 sm:gap-4 md:gap-6 justify-center">
      <Button
        variant="success"
        size="lg"
        onClick={handleHit}
        disabled={isDisabled}
        loading={loading}
        shortcut={bindings?.hit || 'h'}
        className="min-w-[110px] sm:min-w-[130px] md:min-w-[140px]"
      >
        <span className="mr-1.5">🎴</span>
        Hit
      </Button>
      <Button
        variant="danger"
        size="lg"
        onClick={handleStay}
        disabled={isDisabled}
        loading={loading}
        shortcut={bindings?.stay || 's'}
        className="min-w-[110px] sm:min-w-[130px] md:min-w-[140px]"
      >
        <span className="mr-1.5">✋</span>
        Stay
      </Button>
    </div>
  );
}
