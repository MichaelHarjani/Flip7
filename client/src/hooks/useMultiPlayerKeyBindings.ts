import { useEffect, useCallback } from 'react';
import { KEY_BINDING_PROFILES } from '../config/keyBindings';

interface PlayerCallbacks {
  onHit: () => void;
  onStay: () => void;
}

interface MultiPlayerKeyBindingOptions {
  player1Callbacks: PlayerCallbacks;
  player2Callbacks: PlayerCallbacks;
  onNextRound: () => void;
  player1Active: boolean;
  player2Active: boolean;
  roundOver: boolean;
}

export function useMultiPlayerKeyBindings({
  player1Callbacks,
  player2Callbacks,
  onNextRound,
  player1Active,
  player2Active,
  roundOver,
}: MultiPlayerKeyBindingOptions) {
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    // Prevent if typing in input field
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    const p1Bindings = KEY_BINDING_PROFILES.multiP1;
    const p2Bindings = KEY_BINDING_PROFILES.multiP2;
    const key = event.key.toLowerCase();

    // Player 1 controls (only when active)
    if (player1Active) {
      if (key === p1Bindings.hit) {
        event.preventDefault();
        player1Callbacks.onHit();
        return;
      } else if (key === p1Bindings.stay) {
        event.preventDefault();
        player1Callbacks.onStay();
        return;
      }
    }

    // Player 2 controls (only when active)
    if (player2Active) {
      if (key === p2Bindings.hit) {
        event.preventDefault();
        player2Callbacks.onHit();
        return;
      } else if (key === p2Bindings.stay) {
        event.preventDefault();
        player2Callbacks.onStay();
        return;
      }
    }

    // Next round (when round is over)
    if (roundOver && key === p1Bindings.nextRound) {
      event.preventDefault();
      onNextRound();
    }
  }, [player1Callbacks, player2Callbacks, onNextRound, player1Active, player2Active, roundOver]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);
}
