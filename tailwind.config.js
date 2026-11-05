/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          dark: '#0B0F19',
          deep: '#0F172A',
          mist: '#131B2E',
          card: '#182238',
          cardHover: '#1F2C47',
          border: 'rgba(255, 255, 255, 0.08)',
          borderBright: 'rgba(255, 255, 255, 0.16)',
        },
        brand: {
          mint: '#2DD4BF',     // Electric Mint / Cyan
          coral: '#FB7185',    // Neon Coral
          amber: '#FBBF24',    // Warm Amber / Gold
          lavender: '#C084FC', // Lavender Mist
          emerald: '#34D399',  // Vibrant leaf
          sky: '#38BDF8',      // Radiant Sky
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Plus Jakarta Sans', 'sans-serif'],
      },
      boxShadow: {
        'glow-mint': '0 0 25px -5px rgba(45, 212, 191, 0.35)',
        'glow-coral': '0 0 25px -5px rgba(251, 113, 133, 0.35)',
        'glow-amber': '0 0 25px -5px rgba(251, 191, 36, 0.35)',
        'glow-lavender': '0 0 25px -5px rgba(192, 132, 252, 0.35)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      animation: {
        'pulse-subtle': 'pulseSubtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.65' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}
