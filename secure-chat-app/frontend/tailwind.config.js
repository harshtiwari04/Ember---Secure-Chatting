/**
 * tailwind.config.js
 * --------------------
 * Design tokens for the whole app live here. The palette is a warm,
 * low-lit "hearth/embers" theme: near-black backgrounds, a warm amber-orange
 * ember accent, and glass surfaces for auth forms. See src/index.css for the
 * glassmorphism utility classes built on top of these tokens.
 */

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void: {
          DEFAULT: '#0B0A0D', // primary background - near-black, faint warm undertone
          soft: '#131118',
          surface: '#171420',
        },
        ember: {
          DEFAULT: '#FF7A45', // primary warm accent
          glow: '#FFB86B', // lighter amber highlight
          deep: '#8A3B1F', // muted rust for borders/shadows
          dim: '#5A2E1C',
        },
        ink: {
          primary: '#F5EFE6', // warm off-white text
          muted: '#9C9389',
          faint: '#6E655C',
        },
        line: '#2A2430', // hairline borders on dark surfaces
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        ember: '0 0 40px -8px rgba(255, 122, 69, 0.35)',
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        drift: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: 0.6 },
          '50%': { opacity: 1 },
        },
      },
      animation: {
        drift: 'drift 6s ease-in-out infinite',
        pulseGlow: 'pulseGlow 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
