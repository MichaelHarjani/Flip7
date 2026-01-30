export type GameAction = 'hit' | 'stay' | 'nextRound';
export type KeyBindingProfile = 'leftHand' | 'rightHand' | 'multiP1' | 'multiP2';

export interface KeyBinding {
  hit: string;
  stay: string;
  nextRound: string;
}

export const KEY_BINDING_PROFILES: Record<KeyBindingProfile, KeyBinding> = {
  leftHand: {
    hit: 'g',
    stay: 's',
    nextRound: 'a',
  },
  rightHand: {
    hit: 'h',
    stay: 'l',
    nextRound: 'enter',
  },
  multiP1: {
    hit: 'd',
    stay: 'f',
    nextRound: 'enter',
  },
  multiP2: {
    hit: 'j',
    stay: 'k',
    nextRound: 'enter',
  },
};

export const PROFILE_LABELS: Record<KeyBindingProfile, string> = {
  leftHand: 'Left Hand',
  rightHand: 'Right Hand',
  multiP1: 'Player 1',
  multiP2: 'Player 2',
};

// Helper to get display name for key
export function getKeyDisplayName(key: string): string {
  const keyMap: Record<string, string> = {
    enter: '↵',
    ' ': 'Space',
    arrowup: '↑',
    arrowdown: '↓',
    arrowleft: '←',
    arrowright: '→',
  };
  return keyMap[key.toLowerCase()] || key.toUpperCase();
}

// Storage key for persisting profile preference
const STORAGE_KEY = 'flip7_keyBindingProfile';

export function getStoredProfile(): KeyBindingProfile {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in KEY_BINDING_PROFILES) {
      return stored as KeyBindingProfile;
    }
  } catch {
    // localStorage not available
  }
  return 'rightHand'; // default
}

export function setStoredProfile(profile: KeyBindingProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, profile);
  } catch {
    // localStorage not available
  }
}
