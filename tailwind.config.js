/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        th: {
          bg:      'var(--th-bg)',
          surface: 'var(--th-surface)',
          card:    'var(--th-card)',
          border:  'var(--th-border)',
          hover:   'var(--th-hover)',
          text:    'var(--th-text)',
          muted:   'var(--th-muted)',
          dim:     'var(--th-dim)',
          accent:  'var(--th-accent)'
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow':  'spin 2s linear infinite'
      }
    }
  },
  plugins: []
};
