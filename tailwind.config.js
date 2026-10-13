/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Trebuchet MS"', 'ui-rounded', 'system-ui', 'sans-serif'],
        sans: ['ui-rounded', '"Segoe UI"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        ink: { 900: '#14161f', 800: '#1d2030', 700: '#2a2e42', 600: '#3a3f58' },
        cream: '#f6efe0',
      },
      boxShadow: { glow: '0 0 0 3px rgba(251, 191, 36, 0.55)' },
    },
  },
  plugins: [],
}
