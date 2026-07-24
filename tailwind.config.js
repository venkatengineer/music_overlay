/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        alien: {
          bg: '#04090c',
          card: 'rgba(6, 20, 27, 0.75)',
          border: 'rgba(0, 255, 170, 0.3)',
          green: '#00ffaa',
          brightGreen: '#39ff14',
          cyan: '#00e5ff',
          purple: '#b026ff',
          deepBlue: '#0a192f',
          redPlasma: '#ff0055',
          amberReactor: '#ffaa00',
        }
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        rajdhani: ['Rajdhani', 'sans-serif'],
        mono: ['"Share Tech Mono"', 'monospace'],
      },
      boxShadow: {
        'alien-glow': '0 0 20px rgba(0, 255, 170, 0.4), inset 0 0 15px rgba(0, 255, 170, 0.2)',
        'cyan-glow': '0 0 20px rgba(0, 229, 255, 0.4), inset 0 0 15px rgba(0, 229, 255, 0.2)',
        'plasma-glow': '0 0 25px rgba(255, 0, 85, 0.5), inset 0 0 15px rgba(255, 0, 85, 0.3)',
        'holo-glow': '0 0 25px rgba(255, 255, 255, 0.5), inset 0 0 15px rgba(0, 229, 255, 0.2)',
        'amber-glow': '0 0 25px rgba(255, 170, 0, 0.5), inset 0 0 15px rgba(255, 170, 0, 0.2)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'energy-conduit': 'energyFlow 4s linear infinite',
        'slow-spin': 'spin 20s linear infinite',
        'plasma-pulse': 'plasmaPulse 2s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: 0.6, filter: 'drop-shadow(0 0 8px currentColor)' },
          '50%': { opacity: 1, filter: 'drop-shadow(0 0 18px currentColor)' },
        },
        energyFlow: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        plasmaPulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: 0.8 },
          '50%': { transform: 'scale(1.05)', opacity: 1 },
        }
      }
    },
  },
  plugins: [],
}
