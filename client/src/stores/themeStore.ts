import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeType = 'classic-casino' | 'cyberpunk-neon' | 'minimalist' | 'dark-luxury';

interface ThemeConfig {
  name: string;
  bgGradient: string;
  cardBg: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  accentPrimary: string;
  accentSecondary: string;
}

export const themeConfigs: Record<ThemeType, ThemeConfig> = {
  'classic-casino': {
    name: 'Classic Casino',
    bgGradient: 'bg-gradient-to-br from-felt-dark via-felt to-felt-light',
    cardBg: 'bg-gray-800',
    cardBorder: 'border-gold',
    textPrimary: 'text-gold-light',
    textSecondary: 'text-gray-300',
    accentPrimary: 'bg-gold hover:bg-gold-light',
    accentSecondary: 'bg-gold-dark hover:bg-gold',
  },
  'cyberpunk-neon': {
    name: 'Cyberpunk Neon',
    bgGradient: 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900',
    cardBg: 'bg-gray-900',
    cardBorder: 'border-neon-blue',
    textPrimary: 'text-neon-blue',
    textSecondary: 'text-neon-purple',
    accentPrimary: 'bg-neon-pink hover:bg-neon-purple',
    accentSecondary: 'bg-neon-blue hover:bg-neon-green',
  },
  'minimalist': {
    name: 'Minimalist Clean',
    bgGradient: 'bg-gradient-to-br from-minimal-light via-minimal to-minimal-dark',
    cardBg: 'bg-white',
    cardBorder: 'border-minimal-darker',
    textPrimary: 'text-minimal-darker',
    textSecondary: 'text-minimal-dark',
    accentPrimary: 'bg-blue-500 hover:bg-blue-600',
    accentSecondary: 'bg-gray-600 hover:bg-gray-700',
  },
  'dark-luxury': {
    name: 'Dark Luxury',
    bgGradient: 'bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900',
    cardBg: 'bg-gray-800',
    cardBorder: 'border-gray-600',
    textPrimary: 'text-white',
    textSecondary: 'text-gray-300',
    accentPrimary: 'bg-purple-600 hover:bg-purple-500',
    accentSecondary: 'bg-blue-600 hover:bg-blue-500',
  },
};

interface ThemeStore {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  getThemeConfig: () => ThemeConfig;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'dark-luxury',
      setTheme: (theme: ThemeType) => set({ theme }),
      getThemeConfig: () => themeConfigs[get().theme],
    }),
    {
      name: 'flip7-theme',
    }
  )
);

