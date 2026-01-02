/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
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

