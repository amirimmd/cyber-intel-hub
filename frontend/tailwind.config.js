    // frontend/tailwind.config.js
    /** @type {import('tailwindcss').Config} */
    export default {
      content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
      ],
      theme: {
        extend: {
          fontFamily: {
            mono: ['"Roboto Mono"', 'monospace'],
          },
          colors: {
            'dark-bg': '#0d1117',
            'cyber-card': '#161b22',
            'cyber-cyan': '#00ffff',
            'cyber-green': '#00ff00',
            'cyber-red': '#ff0000',
            'cyber-yellow': '#ffff00',
            'cyber-orange': '#ffa500',
            'cyber-text': '#b0c4de',
          },
          animation: {
            'flicker': 'flicker 3s linear infinite alternate',
            'border-pulse': 'border-pulse 4s infinite alternate ease-in-out',
            'grid-pulse': 'grid-pulse 60s linear infinite',
            'scanline': 'scanline 2s infinite linear',
            'blink': 'blink 0.7s steps(1) infinite',
          },
          keyframes: {
            flicker: {
              '0%, 100%': { opacity: 1, textShadow: '0 0 8px #00ffff, 0 0 12px #00ff00' },
              '50%': { opacity: 0.9, textShadow: '0 0 4px #00ffff, 0 0 6px #00ff00' },
            },
            'border-pulse': {
              '0%, 100%': { borderColor: 'rgba(0, 255, 255, 0.2)', boxShadow: '0 0 10px rgba(0, 255, 255, 0.1), inset 0 0 5px rgba(0, 255, 255, 0.05)' },
              '50%': { borderColor: 'rgba(0, 255, 255, 0.6)', boxShadow: '0 0 20px rgba(0, 255, 255, 0.3), inset 0 0 10px rgba(0, 255, 255, 0.1)' },
            },
            'grid-pulse': {
              '0%': { backgroundPosition: '0% 0%' },
              '100%': { backgroundPosition: '100% 100%' },
            },
            scanline: {
              '0%': { transform: 'translateX(-100%)' },
              '100%': { transform: 'translateX(100%)' },
            },
            blink: {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0 },
            },
          },
        },
      },
      plugins: [],
    }
    
