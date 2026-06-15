/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          400: '#60a5fa',
          600: '#2563eb',
          800: '#1e40af',
        },
        ink: {
          400: '#64748b',
          600: '#334155',
          700: '#1e293b',
        },
        amber: {
          50: '#fffbeb',
          400: '#f59e0b',
          600: '#d97706',
        },
        emerald: {
          50: '#ecfdf5',
          400: '#34d399',
          600: '#059669',
        },
        rose: {
          100: '#ffe4e6',
          300: '#fda4af',
          400: '#fb7185',
          600: '#e11d48',
        },
      },
      fontFamily: {
        display: ['"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      borderRadius: {
        card: '30px',
      },
      boxShadow: {
        'panel-inset': 'inset 0 1px 0 rgba(255,255,255,0.85)',
        'panel': '0 4px 24px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
      },
    },
  },
  plugins: [],
};