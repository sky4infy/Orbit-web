import type { Config } from 'tailwindcss';

// Design direction: a night-study-desk feel, not a marketing landing page.
// Deep ink-blue (not near-black) + warm amber (desk-lamp glow), because the
// app is used mostly in the evening between coaching and sleep. Avoided the
// cream+serif+terracotta and near-black+neon defaults on purpose.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#12172B', // primary background
          50: '#1B2140',
          100: '#232A4E',
        },
        paper: '#F6F3EC', // light-mode surface / card background
        amber: {
          DEFAULT: '#F0A868', // brand accent — used for primary actions only, not categories
          soft: '#F7D9B4',
        },
        sage: '#7FA88C', // success / done states
        rust: '#C1666B', // warning / incomplete states
        subject: {
          physics: '#6C93E0',
          chemistry: '#4FB894',
          maths: '#E0AE4F',
          biology: '#D983A6',
        },
      },
      fontFamily: {
        display: ['var(--font-sora)', 'sans-serif'],
        body: ['var(--font-manrope)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};

export default config;
