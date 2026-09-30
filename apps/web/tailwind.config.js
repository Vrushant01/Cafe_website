/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* ── Neutral Whites & Papers ── */
        canvas: {
          DEFAULT: '#F8F5F0',   // warm ivory / cream page bg
          pure: '#FFFFFF',
          warm: '#F3EFE8',      // warm paper surface
          cool: '#ECE7DE',      // card / border surface
        },
        /* ── Charcoal & Espresso Ink Scale ── */
        ink: {
          DEFAULT: '#1E1813',   // deep espresso charcoal
          muted: '#524A42',     // warm body text
          faint: '#857B72',     // placeholder / secondary
          ultra: '#CDC5BB',     // subtle borders / dividers
        },
        /* ── Warm Artisan Accents (Chai, Terracotta, Saffron, Gold) ── */
        gold: {
          DEFAULT: '#C17B3A',   // primary chai caramel
          deep: '#9B5B22',      // hover / dark caramel
          light: '#D99859',     // lighter warm tint
          pale: '#FBF2E8',      // ultra-light cream bg
          muted: '#EED7BE',     // soft border tint
        },
        caramel: {
          DEFAULT: '#C17B3A',
          dark: '#9B5B22',
          light: '#FBF2E8',
        },
        terracotta: {
          DEFAULT: '#B85D38',   // earthy terracotta
          hover: '#984725',
          light: '#FDF0EA',
        },
        saffron: {
          DEFAULT: '#D97706',   // warm saffron amber
          light: '#FEF3C7',
          dark: '#B45309',
        },
        /* ── Earthy Botanical Accents ── */
        sage: {
          DEFAULT: '#4E6B56',   // botanical green
          light: '#EDF4EE',
          dark: '#38503E',
        },
        /* ── Semantic Feedback ── */
        ok: {
          DEFAULT: '#3F724D',
          bg: '#ECF4EE',
          border: '#B6D7BE',
        },
        warn: {
          DEFAULT: '#B46C24',
          bg: '#FDF5EC',
          border: '#E8CA9E',
        },
        danger: {
          DEFAULT: '#A6382C',
          bg: '#FDF0EE',
          border: '#E5B7B1',
        },
        /* ── Legacy aliases for compatibility ── */
        cream: {
          DEFAULT: '#F3EFE8',
          light: '#F8F5F0',
          dark: '#E7E1D6',
        },
        coffee: {
          DEFAULT: '#1E1813',
          light: '#524A42',
          dark: '#140F0B',
        },
        terracotta: {
          DEFAULT: '#B8935A',
          hover: '#8F6B36',
          light: '#D4AA78',
        },
        sage: {
          DEFAULT: '#8A8A84',
          light: '#ADADAA',
          dark: '#6A6A64',
        },
        success: {
          DEFAULT: '#4A7C59',
          light: '#EAF3EB',
        },
        warning: {
          DEFAULT: '#B07C3A',
          light: '#FBF4E8',
        },
        error: {
          DEFAULT: '#A0392A',
          light: '#F9EDEA',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F5F3EF',
        },
        amber: {
          DEFAULT: '#B07C3A',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Cormorant Garamond', 'Georgia', 'serif'],
        serif: ['var(--font-serif)', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'Courier New', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        '3xs': ['0.5rem', { lineHeight: '0.75rem' }],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(26,26,24,0.06), 0 1px 2px rgba(26,26,24,0.04)',
        'card-md': '0 4px 12px rgba(26,26,24,0.08), 0 2px 4px rgba(26,26,24,0.04)',
        'card-lg': '0 8px 32px rgba(26,26,24,0.10), 0 4px 8px rgba(26,26,24,0.06)',
        'gold-glow': '0 0 0 3px rgba(184,147,90,0.15)',
        'inset-sm': 'inset 0 1px 3px rgba(26,26,24,0.06)',
      },
      borderRadius: {
        'sm': '6px',
        DEFAULT: '10px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '32px',
        '4xl': '40px',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      letterSpacing: {
        'label': '0.08em',
        'heading': '-0.02em',
        'wide-xl': '0.2em',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      backgroundImage: {
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};
