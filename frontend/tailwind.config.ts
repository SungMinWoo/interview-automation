import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    borderRadius: {
      none: '0',
      DEFAULT: '0',
      full: '9999px', // only for dots/avatars
    },
    extend: {
      colors: {
        surface: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          hover: 'var(--bg-hover)',
          active: 'var(--bg-active)',
          input: 'var(--bg-input)',
          glass: 'var(--bg-glass)',
        },
        content: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          muted: 'var(--text-muted)',
          disabled: 'var(--text-disabled)',
        },
        line: {
          DEFAULT: 'var(--border-default)',
          hover: 'var(--border-hover)',
          focus: 'var(--border-focus)',
        },
        accent: {
          DEFAULT: 'var(--accent-bg)',
          text: 'var(--accent-text)',
          hover: 'var(--accent-hover)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          bg: 'var(--danger-bg)',
        },
        success: {
          DEFAULT: 'var(--success)',
          bg: 'var(--success-bg)',
        },
        warning: {
          DEFAULT: 'var(--warning-color)',
          bg: 'var(--warning-bg)',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}

export default config
