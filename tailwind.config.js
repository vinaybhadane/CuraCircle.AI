/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0284c7',
          600: '#0369a1',
          700: '#075985',
          800: '#0c4a6e',
          900: '#082f49',
        },
        elder: {
          bg: '#fafafa',
          card: '#ffffff',
          primary: '#0d5c75',
          accent: '#e05a47',
          success: '#1b8a5a',
          warning: '#c27803',
          border: '#334155',
        }
      },
      fontSize: {
        'elder-sm': ['1.125rem', { lineHeight: '1.75rem' }],
        'elder-base': ['1.25rem', { lineHeight: '1.875rem' }],
        'elder-lg': ['1.5rem', { lineHeight: '2rem' }],
        'elder-xl': ['1.875rem', { lineHeight: '2.25rem' }],
        'elder-2xl': ['2.25rem', { lineHeight: '2.5rem' }],
        'elder-3xl': ['3rem', { lineHeight: '1.16' }],
      },
      minHeight: {
        'touch': '48px',
        'elder-touch': '64px',
      },
      minWidth: {
        'touch': '48px',
        'elder-touch': '64px',
      }
    },
  },
  plugins: [],
};
