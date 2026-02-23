import type { Config } from 'tailwindcss';
import { colors } from './theme/colors';

const config = {
  content: [
    './index.html',
    './**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Semantic aliases
        success: colors.success,
        warning: colors.warning,
        danger: colors.danger,
        info: colors.info,
        neutral: colors.neutral,
        surface: colors.surface,
        ops: colors.ops,
      },
      fontFamily: {
        display: ['Recursive', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Recursive', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['Recursive', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        'display-lg': ['2.25rem', { lineHeight: '1.1', letterSpacing: '-0.01em', fontWeight: '600' }],
        'display-md': ['1.5rem', { lineHeight: '1.15', letterSpacing: '0.02em', fontWeight: '600' }],
        'display-sm': ['1.125rem', { lineHeight: '1.2', letterSpacing: '0.02em', fontWeight: '600' }],
        'label': ['0.6875rem', { lineHeight: '1', letterSpacing: '0.08em', fontWeight: '500' }],
      },
      boxShadow: {
        'glow-primary': '0 0 20px -5px rgba(0, 196, 167, 0.5)',
        'glow-success': '0 0 20px -5px rgba(0, 255, 148, 0.5)',
        'glow-warning': '0 0 20px -5px rgba(255, 184, 0, 0.5)',
        'glow-danger': '0 0 20px -5px rgba(225, 29, 72, 0.5)',
        'glow-info': '0 0 20px -5px rgba(0, 163, 255, 0.5)',
        'glow-sm': '0 0 10px -3px rgba(0, 196, 167, 0.3)',
        'panel': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.15)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.03)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'grid-pattern': "linear-gradient(to right, rgba(31,38,51,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(31,38,51,0.5) 1px, transparent 1px)",
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'terminal-in': 'terminal-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fade-in 0.4s ease-out forwards',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
      },
      keyframes: {
        'terminal-in': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
