/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'rail-dark': '#0a0f1c',
        'rail-darker': '#050914',
        'rail-blue': '#1e3a8a',
        'rail-light-blue': '#3b82f6',
        'rail-accent': '#06b6d4',
        'rail-success': '#10b981',
        'rail-warning': '#f59e0b',
        'rail-danger': '#ef4444',
        'rail-gray': '#374151',
        'rail-light-gray': '#6b7280',
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'rail-glow': '0 0 20px rgba(59, 130, 246, 0.3)',
        'rail-glow-accent': '0 0 20px rgba(6, 182, 212, 0.3)',
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
