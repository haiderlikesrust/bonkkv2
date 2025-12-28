/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          400: '#FF6B35',
          500: '#FF8C42',
          600: '#E85D04',
        },
        dark: {
          700: '#1a1a1a',
          800: '#0F0F0F',
          900: '#000000',
        }
      },
      backgroundImage: {
        'gradient-hot': 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)',
      }
    },
  },
  plugins: [],
}

