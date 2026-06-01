import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        serif: ['"Plus Jakarta Sans"', 'sans-serif'], // alias — sem serifadas
      },
      colors: {
        bg:      'var(--color-bg)',
        card:    'var(--color-card)',
        ink:     'var(--color-ink)',
        muted:   'var(--color-muted)',
        primary: 'var(--color-primary)',
        border:  'var(--color-border)',
        good:    '#7ad1a8',
        major:   '#7ad1a8',
        minor:   '#8ab4f0',
        dim:     '#e88a8a',
        // compat aliases
        accent:  'var(--color-primary)',
        panel:   'var(--color-card)',
      },
      boxShadow: {
        card:  'var(--shadow-card)',
        input: 'var(--shadow-input)',
        btn:   'var(--shadow-btn)',
      },
      borderColor: {
        DEFAULT: 'var(--color-border)',
      },
    },
  },
  plugins: [],
} satisfies Config
