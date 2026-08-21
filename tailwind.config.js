/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        jedadi: {
          dark: '#0B0F19',
          blue: '#13BFFF',
          purple: '#A855F7',
          orange: '#FF8A00',
          green: '#22C55E',
          gray: '#9CA3AF',
        },
      },
    },
  },
  plugins: [],
}