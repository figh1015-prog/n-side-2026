/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4F46E5',
          50: '#EEEDFD',
          100: '#C7C4FA',
          200: '#A19BF7',
          300: '#7B72F4',
          400: '#5549F1',
          500: '#4F46E5',
          600: '#3730A3',
          700: '#2F2882',
          800: '#261F61',
          900: '#1E1740',
        },
        cyan: {
          DEFAULT: '#06B6D4',
          400: '#22D3EE',
          500: '#06B6D4',
          600: '#0891B2',
        },
        dark: {
          bg: '#0f0f0f',
          sidebar: '#1a1a2e',
          card: '#1e1e30',
          border: '#2d2d4a',
          text: '#e2e8f0',
          muted: '#94a3b8',
        }
      },
      fontFamily: {
        sans: ['Pretendard', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-in': 'slideIn 0.2s ease-in-out',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      transitionDuration: {
        '200': '200ms',
      },
    },
  },
  plugins: [],
}
