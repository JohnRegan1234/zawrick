/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./ui/**/*.{html,js}",
    "./*.js"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: '#ff6600',
        'accent-dark': '#ff9800',
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif'
        ],
      },
      borderRadius: {
        'xl': '16px',
        'lg': '10px',
      },
      spacing: {
        'gap': '12px',
        'gap-sm': '8px',
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
      }
    },
  },
  plugins: [],
} 