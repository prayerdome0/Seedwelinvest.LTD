import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1rem', sm: '1.5rem', lg: '2rem', '2xl': '2.5rem' },
      screens: { '2xl': '1320px' },
    },
    extend: {
      colors: {
        navy: {
          50: '#F2F5FA',
          100: '#E2E9F3',
          200: '#C6D2E6',
          300: '#9DB0D1',
          400: '#6D86B3',
          500: '#486697',
          600: '#33507D',
          700: '#274066',
          800: '#1A2C48',
          900: '#0F172A',
          950: '#080E1B',
        },
        brand: {
          50: '#FEF2F3',
          100: '#FCE4E7',
          200: '#F9CCD1',
          300: '#F3A0AA',
          400: '#EA6B79',
          500: '#E11D2E',
          600: '#C8182A',
          700: '#A51224',
          800: '#8A1123',
          900: '#741324',
        },
        gold: {
          100: '#FBF1D8',
          200: '#F6E0AC',
          300: '#F2CF80',
          400: '#E9B949',
          500: '#D9A22F',
          600: '#B27F1E',
        },
        mist: '#F7F9FC',
      },
      fontFamily: {
        sans: ['Inter Variable', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        display: ['Inter Variable', 'ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -12px rgba(15, 23, 42, 0.12)',
        lift: '0 2px 4px rgba(15, 23, 42, 0.05), 0 18px 40px -18px rgba(15, 23, 42, 0.22)',
        nav: '0 1px 0 rgba(15, 23, 42, 0.06)',
      },
      maxWidth: {
        prose2: '68ch',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.4s ease both',
        'slide-in': 'slide-in 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
