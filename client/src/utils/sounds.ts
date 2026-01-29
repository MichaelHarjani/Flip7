// Sound effects using Web Audio API - no external files needed

type SoundType = 'cardDraw' | 'cardPlace' | 'bust' | 'win' | 'click' | 'error' | 'flip7' | 'yourTurn';

// Audio context singleton
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

// Check if sounds are enabled (stored in localStorage)
function isSoundEnabled(): boolean {
  const stored = localStorage.getItem('flip7_soundEnabled');
  return stored !== 'false'; // Default to true
}

export function setSoundEnabled(enabled: boolean): void {
  localStorage.setItem('flip7_soundEnabled', String(enabled));
}

export function getSoundEnabled(): boolean {
  return isSoundEnabled();
}

// Play a simple tone
function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.3,
  decay: boolean = true
): void {
  if (!isSoundEnabled()) return;

  try {
    const ctx = getAudioContext();

    // Resume context if suspended (required for autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    if (decay) {
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    }

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (e) {
    // Silently fail if audio isn't available
    console.warn('Audio playback failed:', e);
  }
}

// Play multiple tones in sequence (for melodies)
function playSequence(
  notes: Array<{ freq: number; duration: number; delay: number }>,
  type: OscillatorType = 'sine',
  volume: number = 0.3
): void {
  notes.forEach(({ freq, duration, delay }) => {
    setTimeout(() => {
      playTone(freq, duration, type, volume);
    }, delay * 1000);
  });
}

// Sound effect definitions
const sounds: Record<SoundType, () => void> = {
  cardDraw: () => {
    // Quick swoosh sound - short high frequency
    playTone(800, 0.08, 'sine', 0.2);
    setTimeout(() => playTone(600, 0.05, 'sine', 0.15), 30);
  },

  cardPlace: () => {
    // Soft thud - low frequency
    playTone(150, 0.1, 'sine', 0.25);
  },

  bust: () => {
    // Descending tones - failure sound
    playSequence([
      { freq: 400, duration: 0.15, delay: 0 },
      { freq: 300, duration: 0.15, delay: 0.1 },
      { freq: 200, duration: 0.25, delay: 0.2 },
    ], 'sawtooth', 0.2);
  },

  win: () => {
    // Ascending triumphant tones
    playSequence([
      { freq: 523, duration: 0.15, delay: 0 },      // C5
      { freq: 659, duration: 0.15, delay: 0.12 },   // E5
      { freq: 784, duration: 0.15, delay: 0.24 },   // G5
      { freq: 1047, duration: 0.4, delay: 0.36 },   // C6
    ], 'sine', 0.25);
  },

  click: () => {
    // Simple click - very short high tone
    playTone(1000, 0.03, 'sine', 0.15, false);
  },

  error: () => {
    // Buzzer sound
    playTone(200, 0.2, 'square', 0.15);
  },

  flip7: () => {
    // Celebratory fanfare
    playSequence([
      { freq: 523, duration: 0.1, delay: 0 },
      { freq: 659, duration: 0.1, delay: 0.08 },
      { freq: 784, duration: 0.1, delay: 0.16 },
      { freq: 1047, duration: 0.1, delay: 0.24 },
      { freq: 784, duration: 0.1, delay: 0.32 },
      { freq: 1047, duration: 0.3, delay: 0.4 },
    ], 'sine', 0.3);
  },

  yourTurn: () => {
    // Pleasant notification chime - gentle alert
    playSequence([
      { freq: 880, duration: 0.1, delay: 0 },     // A5
      { freq: 1047, duration: 0.15, delay: 0.1 }, // C6
    ], 'sine', 0.25);
  },
};

// Main function to play sounds
export function playSound(type: SoundType): void {
  sounds[type]?.();
}

// Hook for React components
import { useCallback } from 'react';

export function useSound() {
  const play = useCallback((type: SoundType) => {
    playSound(type);
  }, []);

  return { play, setSoundEnabled, getSoundEnabled };
}
