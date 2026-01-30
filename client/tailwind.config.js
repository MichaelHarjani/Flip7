/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      spacing: {
        '13': '3.25rem',
        '15': '3.75rem',
        '17': '4.25rem',
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
      },
      colors: {
        // Flip 7 authentic theme colors
        flip7: {
          // Backgrounds - warm wood tones
          'wood-dark': '#2d1810',
          'wood-medium': '#3d2518',
          'wood-light': '#4d3520',
          'card-base': '#f5f1e8',

          // Decorative elements
          'border': '#8b4513',
          'gold': '#d4af37',
          'vintage': '#c19a6b',
          'copper': '#cd853f',

          // Number card colors (0-12)
          'num-0': '#1e90ff',
          'num-1': '#6b8e23',
          'num-2': '#daa520',
          'num-3': '#8b1a3d',
          'num-4': '#4682b4',
          'num-5': '#2e8b57',
          'num-6': '#8b4789',
          'num-7': '#a0522d',
          'num-8': '#9acd32',
          'num-9': '#ff8c00',
          'num-10': '#dc143c',
          'num-11': '#4169e1',
          'num-12': '#708090',

          // Modifier colors
          'mod-base': '#f4a460',
          'mod-gold': '#daa520',
          'mod-bronze': '#cd853f',
          'mod-chocolate': '#d2691e',

          // Action card colors
          'freeze': '#87ceeb',
          'flip-three': '#ffd700',
          'second-chance': '#ff1493',

          // UI colors
          'success': '#2e8b57',
          'danger': '#8b1a3d',
          'warning': '#daa520',
          'info': '#4682b4',
        },
        // Card type colors (legacy)
        card: {
          number: '#1d4ed8',
          modifier: '#15803d',
          multiplier: '#7e22ce',
          freeze: '#0891b2',
          flipThree: '#ea580c',
          secondChance: '#ca8a04',
        },
        accent: {
          gold: '#fbbf24',
        },
        // Casino luxury theme
        felt: {
          light: '#2d5a3d',
          DEFAULT: '#1a4d2e',
          dark: '#0f2818',
        },
        gold: {
          light: '#ffd700',
          DEFAULT: '#f4c430',
          dark: '#daa520',
        },
        // Cyberpunk Neon theme
        neon: {
          blue: '#00f0ff',
          pink: '#ff006e',
          purple: '#8b5cf6',
          green: '#00ff9f',
          yellow: '#ffee00',
        },
        // Minimalist theme
        minimal: {
          light: '#f8f9fa',
          DEFAULT: '#e9ecef',
          dark: '#adb5bd',
          darker: '#495057',
        },
      },
      fontFamily: {
        'display': ['Georgia', 'Times New Roman', 'serif'],
        'card': ['Courier New', 'monospace'],
      },
      backgroundImage: {
        'card-texture': 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,.02) 2px, rgba(0,0,0,.02) 4px)',
        'wood-grain': 'linear-gradient(90deg, rgba(0,0,0,0.1) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
        'flip7-gradient': 'linear-gradient(135deg, #2d1810 0%, #3d2518 50%, #2d1810 100%)',
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.4)',
        'vintage': '0 1px 3px rgba(139,69,19,0.5), 0 0 0 1px rgba(212,175,55,0.3)',
        'gold-glow': '0 0 20px rgba(212,175,55,0.5), 0 0 40px rgba(212,175,55,0.3)',
      },
      animation: {
        'flip': 'flip 0.6s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'glow': 'glow 2s ease-in-out infinite',
        'shake': 'shake 0.5s ease-in-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'scale-in': 'scaleIn 0.3s ease-out',
        'bounce-soft': 'bounceSoft 0.5s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
        'border-glow': 'borderGlow 2s ease-in-out infinite',
      },
      keyframes: {
        flip: {
          '0%': { transform: 'rotateY(0deg) scale(0.8)', opacity: '0' },
          '50%': { transform: 'rotateY(90deg) scale(1)', opacity: '0.5' },
          '100%': { transform: 'rotateY(0deg) scale(1)', opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%) scale(0.8)', opacity: '0' },
          '100%': { transform: 'translateX(0) scale(1)', opacity: '1' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(59, 130, 246, 0.5), 0 0 10px rgba(59, 130, 246, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.8), 0 0 30px rgba(59, 130, 246, 0.6)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        borderGlow: {
          '0%, 100%': { 
            boxShadow: '0 0 8px rgba(234, 179, 8, 0.6), 0 0 12px rgba(234, 179, 8, 0.4), 0 0 16px rgba(234, 179, 8, 0.2)',
          },
          '50%': { 
            boxShadow: '0 0 16px rgba(250, 204, 21, 0.9), 0 0 24px rgba(250, 204, 21, 0.7), 0 0 32px rgba(250, 204, 21, 0.4)',
          },
        },
      },
    },
  },
  plugins: [],
}

