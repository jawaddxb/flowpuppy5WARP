import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/agentStage/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        'fp-bg': 'rgb(var(--bg))',
        'fp-surface': 'rgb(var(--surface))',
        'fp-text': 'rgb(var(--text))',
        'fp-border': 'rgb(var(--border))',
        'fp-primary': 'rgb(var(--primary))',
        'fp-primary-600': 'rgb(var(--primary-600))',
        'fp-accent': 'rgb(var(--accent))'
      },
      borderRadius: {
        'fp-sm': '8px',
        'fp-md': '12px',
        'fp-lg': '16px'
      },
      boxShadow: {
        'fp-1': '0 1px 2px rgba(15,23,42,0.06), 0 2px 8px rgba(15,23,42,0.04)'
      }
    },
  },
  plugins: [],
} satisfies Config

