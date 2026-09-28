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
        cream: {
          DEFAULT: '#F4ECE0',
          light: '#FBF7F0',
          dark: '#E8DCCF',
        },
        coffee: {
          DEFAULT: '#3B2A21',
          light: '#533C2F',
          dark: '#261B15',
        },
        terracotta: {
          DEFAULT: '#8B5E3C',
          hover: '#734C2F',
          light: '#A6744E',
        },
        sage: {
          DEFAULT: '#7C8B85',
          light: '#A0ADA8',
          dark: '#5E6D67',
        },
        success: {
          DEFAULT: '#5A8F5A',
          light: '#EAF3EA',
        },
        warning: {
          DEFAULT: '#C98A3B',
          light: '#FBF3E7',
        },
        error: {
          DEFAULT: '#B24A3A',
          light: '#F9ECE9',
        },
        surface: {
          DEFAULT: '#FFFDF9',
          muted: '#F7F2EA',
        },
      },
      fontFamily: {
        serif: ['var(--font-heading)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
