import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // Paleta principal do CarrosselAI
        background: '#0a0a0f',
        foreground: '#f8f8f2',
        card: {
          DEFAULT: '#13131a',
          foreground: '#f8f8f2',
        },
        popover: {
          DEFAULT: '#13131a',
          foreground: '#f8f8f2',
        },
        primary: {
          DEFAULT: '#ff4500',    // Laranja vibrante
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#1e1e2e',
          foreground: '#f8f8f2',
        },
        muted: {
          DEFAULT: '#1e1e2e',
          foreground: '#6e6e8a',
        },
        accent: {
          DEFAULT: '#ff4500',
          foreground: '#ffffff',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#f8f8f2',
        },
        border: '#2a2a3e',
        input: '#2a2a3e',
        ring: '#ff4500',
        // Status colors para badges
        status: {
          gerando: '#3b82f6',
          aguardando: '#f59e0b',
          agendado: '#8b5cf6',
          postado: '#22c55e',
          erro: '#ef4444',
        },
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.375rem',
      },
      fontFamily: {
        // Bebas Neue para títulos dramáticos
        bebas: ['var(--font-bebas)', 'Impact', 'sans-serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        // Animação de pulso para loading
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        // Fade in suave
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        shimmer: 'shimmer 2s infinite linear',
        fadeIn: 'fadeIn 0.3s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
