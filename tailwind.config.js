/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#FAF6E8',
          100: '#F5ECC6',
          200: '#EBD88E',
          300: '#E1C556',
          400: '#D8B227',
          500: '#D4AF37', // Gold Accent
          600: '#B38E22',
          700: '#8C6C18',
          800: '#654E10',
          900: '#42320A',
        },
        dark: {
          950: '#07080A',
          900: '#0C0E14',
          800: '#151822',
          700: '#202535',
          600: '#2E3548',
          500: '#404961',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'gold-glow': '0 0 25px -5px rgba(212, 175, 55, 0.3)',
        'gold-glow-sm': '0 0 12px -3px rgba(212, 175, 55, 0.25)',
      }
    },
  },
  plugins: [],
}
