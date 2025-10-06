/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'rail-dark': '#ffffff',
        'rail-darker': '#f8f9fa',
        'rail-blue': '#495057',
        'rail-light-blue': '#6c757d',
        'rail-accent': '#000000',
        'rail-text': '#1a1a1a',
        'rail-text-secondary': '#4a4a4a',
        'rail-success': '#10b981',
        'rail-warning': '#f59e0b',
        'rail-danger': '#ef4444',
        'rail-info': '#3b82f6',
        'rail-gray': '#e5e7eb',
        'rail-light-gray': '#f3f4f6',
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'rail-glow': '0 0 20px rgba(156, 163, 175, 0.3)',
        'rail-glow-accent': '0 0 20px rgba(249, 250, 251, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
