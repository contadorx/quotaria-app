import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#12284B', deep: '#0C1B33', soft: '#1C3763' },
        gold: { DEFAULT: '#C6A15B', soft: '#D8BC85' },
        cream: { DEFAULT: '#F7F3E9', deep: '#EFE8D6' },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
