/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        secondary: '#8b5cf6',
        emergency: '#ef4444',
        high: '#f97316',
        medium: '#eab308',
        low: '#22c55e',
      },
    },
  },
  plugins: [],
}
