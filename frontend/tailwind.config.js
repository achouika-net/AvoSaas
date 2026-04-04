/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // We enforce dark mode by default via class
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0F172A', // Slate-900 (Main BG)
          800: '#1E293B', // Slate-800 (Card BG)
          700: '#334155', // Slate-700 (Border)
        },
        primary: {
          500: '#3B82F6', // Blue (Accent)
          600: '#2563EB', // Blue Hover
        }
      }
    },
  },
  plugins: [],
}
