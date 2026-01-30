import { useEffect, useCallback } from 'react';
import { KEY_BINDING_PROFILES, KeyBindingProfile } from '../config/keyBindings';

interface KeyBindingCallbacks {
  onHit: () => void;
  onStay: () => void;
  onNextRound: () => void;
}

export function useKeyBindings(
  callbacks: KeyBindingCallbacks,
  profile: KeyBindingProfile,
  enabled: boolean = true
) {
  const { onHit, onStay, onNextRound } = callbacks;

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    // Prevent if typing in input field
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    const bindings = KEY_BINDING_PROFILES[profile];
    const key = event.key.toLowerCase();

    if (key === bindings.hit) {
      event.preventDefault();
      onHit();
    } else if (key === bindings.stay) {
      event.preventDefault();
      onStay();
    } else if (key === bindings.nextRound) {
      event.preventDefault();
      onNextRound();
    }
  }, [onHit, onStay, onNextRound, profile]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress, enabled]);

  // Return the current bindings for display purposes
  return KEY_BINDING_PROFILES[profile];
}
