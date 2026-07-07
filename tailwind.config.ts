import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#12284B', deep: '#0B1A30', soft: '#1C3763' },
        gold: { DEFAULT: '#C6A15B', soft: '#D8BC85', deep: '#A8873F' },
        cream: { DEFAULT: '#F7F3E9', deep: '#EFE8D6' },
        // sidebar (rail) navy escura
        rail: { DEFAULT: '#0B1A30', hover: '#17294A', muted: '#8B97AC' },
        // superfícies e neutros
        surface: '#F5F3EC',
        line: '#E9E5DB',
        ink: { DEFAULT: '#1B2A44', muted: '#5C6B84', soft: '#94A0B5' },
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(12,27,51,.04), 0 1px 3px rgba(12,27,51,.06)',
        rail: '2px 0 20px rgba(0,0,0,.08)',
      },
      borderRadius: { xl2: '14px' },
    },
  },
  plugins: [],
}

export default config
