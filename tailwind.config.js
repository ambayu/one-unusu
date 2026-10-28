/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        page: '#F1F5F2',
        surface: '#FFFFFF',
        borderGreen: '#D8E5DC',
        primaryGreen: {
          DEFAULT: '#166534',
          hover: '#14532D',
          deep: '#14532D',
          secondary: '#15803D',
          accent: '#22C55E',
          soft: '#DCFCE7',
          pale: '#F0FDF4',
        },
        brand: {
          50: '#f0f8f3',
          100: '#dbefe2',
          200: '#b6dfc6',
          300: '#82c5a0',
          400: '#4ba675',
          500: '#278a57',
          600: '#186f45',
          700: '#125a38',
          800: '#0e482d',
          900: '#0b3a25',
          950: '#052116',
        },
        gold: {
          50: '#fbf7ea',
          100: '#f5ebc8',
          200: '#ecd99a',
          300: '#e2c46d',
          400: '#d3ac46',
          500: '#be932f',
          600: '#9c7624',
          700: '#7b5c1f',
        },
        ivory: '#faf9f5',
        unusu: {
          green: {
            DEFAULT: '#0A5C36',
            dark: '#064226',
            light: '#117A4A',
            50: '#F0FDF4',
            100: '#DCFCE7',
          },
          gold: {
            DEFAULT: '#D4AF37',
            light: '#F3E5AB',
            dark: '#AA820A'
          }
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
