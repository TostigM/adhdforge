import type { Config } from 'tailwindcss';

// Inviolable Rule #1: No red. Anywhere. Ever.
// The full design-token system (including colour token enforcement) lands in M3.
// For now: the red and rose palettes are excluded. Use fuchsia for destructive actions.
// Rule #7: Pure black (#000000) is banned in dark mode — floor is slate-900.

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'media',
  theme: {
    extend: {
      // Design tokens added in M3 (Doc 02 §1–7)
    },
  },
  plugins: [],
};

export default config;
