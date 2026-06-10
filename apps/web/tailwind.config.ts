/**
 * Focus Forge — Tailwind Config (web app)
 * Extends the design system preset from packages/ui.
 * The preset handles all tokens, color restrictions, and animations.
 */
import type { Config } from 'tailwindcss';
import focusForgePreset from '../../packages/ui/tailwind.preset';

const config: Config = {
  presets: [focusForgePreset as import('tailwindcss').Config],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
};

export default config;
