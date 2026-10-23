/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
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
      }
    },
  },
  plugins: [],
}
