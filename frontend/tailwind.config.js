/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        green: {
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
        },
        dark: {
          700: '#171F2A',
          800: '#121820',
          900: '#0B0F14',
        },
        gray: {
          700: '#1F2937',
          800: '#111827',
        }
      },
    },
  },
  plugins: [],
}

