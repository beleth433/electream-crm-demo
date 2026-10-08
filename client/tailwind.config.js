/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Rubik', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        border: 'var(--border)',
        ring: 'var(--ring)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        tech: {
          dark: '#060b08',
          card: '#0c1511',
          cardHover: '#101d17',
          lightBg: '#f2f6f4',
          lightCard: '#ffffff',
        },
      },
      boxShadow: {
        'contour-emerald': '0 0 15px -2px rgba(16, 185, 129, 0.18)',
        'contour-emerald-lg': '0 0 30px -4px rgba(16, 185, 129, 0.28)',
        'contour-rose': '0 0 15px -2px rgba(244, 63, 94, 0.2)',
        'contour-amber': '0 0 15px -2px rgba(245, 158, 11, 0.2)',
        'contour-sky': '0 0 15px -2px rgba(14, 165, 233, 0.2)',
      },
    },
  },
  plugins: [],
}

