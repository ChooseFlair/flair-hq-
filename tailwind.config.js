/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Almarai', 'system-ui', 'sans-serif'],
      },
      colors: {
        flair: {
          50: '#f4f7f5',
          100: '#e0e8e3',
          200: '#c1d1c7',
          300: '#9bb5a3',
          400: '#74967e',
          500: '#567862',
          600: '#44604f',
          700: '#2c4a3e',  // Primary forest green
          800: '#253d34',
          900: '#1e322a',
          950: '#111c17',
        },
        cream: {
          50: '#fdfcfa',
          100: '#f9f6f1',
          200: '#f2ece0',
          300: '#e8dece',
          400: '#d4c4a8',
          500: '#c4a882',
          600: '#b08f5e',
          700: '#94754a',
          800: '#785f3e',
          900: '#634f35',
        },
        sage: {
          50: '#f4f7f4',
          100: '#e4ebe4',
          200: '#c9d8c9',
          300: '#a4bea4',
          400: '#8faf8f',  // Accent sage
          500: '#6a936a',
          600: '#537653',
          700: '#445f44',
          800: '#394d39',
          900: '#304030',
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(44, 74, 62, 0.1)',
        'glass-lg': '0 25px 50px -12px rgba(44, 74, 62, 0.15)',
        'glass-inset': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.1)',
      },
    },
  },
  plugins: [],
}
