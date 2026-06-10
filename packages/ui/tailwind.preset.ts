/**
 * Focus Forge — Tailwind Preset
 * ─────────────────────────────────────────────────────────────────────────────
 * All design tokens defined in 02-design-system.md §2–8 and §13.
 *
 * Key invariants:
 *   • No red. `red` and `rose` are intentionally absent; ESLint enforces this.
 *   • All colors reference CSS variables — theming happens in globals.css.
 *   • Accent = violet. Errors = fuchsia. Priority scale: bronze→silver→gold→amber.
 */
import type { Config } from 'tailwindcss';

// Presets don't require 'content' — it's provided by the consuming config.
type Preset = Omit<Config, 'content'>;

// ─── Red banishment ───────────────────────────────────────────────────────────
// We do NOT define red/rose color tokens here — they are intentionally absent.
// Tailwind v3 JIT only emits CSS for classes that appear in content files, so
// omitting these tokens means no `text-red-*` / `bg-red-*` CSS is ever generated
// unless a developer explicitly writes those class names.
//
// Enforcement is at the ESLint layer: eslint-plugin-tailwindcss (or a custom
// rule) should flag `*-red-*` and `*-rose-*` class names in CI.
//
// Use `text-soft-error` / `bg-soft-error` (fuchsia-500) instead.
// See 02-design-system.md §2.1

const preset: Preset = {
  darkMode: ['selector', '[data-theme="dark"]'],

  theme: {
    extend: {
      // ── Colors (all reference CSS variables) ─────────────────────────────
      colors: {
        // Backgrounds
        bg: {
          page:     'var(--bg-page)',
          surface:  'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
          overlay:  'var(--bg-overlay)',
        },
        // Text
        text: {
          primary:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary:  'var(--text-tertiary)',
        },
        // Priority display palette (data model: priority_kind + priority_level)
        priority: {
          bronze: 'var(--priority-bronze)', // low
          silver: 'var(--priority-silver)', // med
          gold:   'var(--priority-gold)',   // high
          amber:  'var(--priority-amber)',  // cant_miss
        },
        // Accent
        accent: {
          DEFAULT: 'var(--accent)',
          soft:    'var(--accent-soft)',
        },
        // Functional
        success:      'var(--success)',
        info:         'var(--info)',
        warning:      'var(--warning)',
        'soft-error': 'var(--soft-error)',

        // red / rose intentionally absent — see comment above the preset
      },

      // ── Typography ─────────────────────────────────────────────────────
      fontFamily: {
        sans:    ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono:    ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        display: ['Inter', 'sans-serif'],
      },

      fontSize: {
        xs:      ['0.75rem',  { lineHeight: '1.5' }],  // 12px
        sm:      ['0.875rem', { lineHeight: '1.5' }],  // 14px
        base:    ['1rem',     { lineHeight: '1.6' }],  // 16px
        lg:      ['1.125rem', { lineHeight: '1.5' }],  // 18px
        xl:      ['1.25rem',  { lineHeight: '1.4' }],  // 20px
        '2xl':   ['1.5rem',   { lineHeight: '1.3' }],  // 24px
        '3xl':   ['2rem',     { lineHeight: '1.2' }],  // 32px
        display: ['3rem',     { lineHeight: '1.1' }],  // 48px
      },

      fontWeight: {
        normal: '400',
        medium: '500',
        bold:   '700',
      },

      maxWidth: {
        prose: '65ch',  // Max reading width per §3.4
      },

      // ── Border radius ────────────────────────────────────────────────
      borderRadius: {
        sm:   '0.25rem',    // 4px  — micro elements
        DEFAULT: '0.5rem',  // 8px  — buttons, inputs, cards
        lg:   '0.75rem',    // 12px — modal corners
        xl:   '1rem',       // 16px — hero cards
        '2xl':'1.25rem',    // 20px — large cards
        full: '9999px',     // avatars, pill badges
      },

      // ── Shadows ──────────────────────────────────────────────────────
      boxShadow: {
        sm:             '0 1px 2px rgba(0,0,0,0.3)',
        DEFAULT:        '0 4px 12px rgba(0,0,0,0.4)',
        lg:             '0 12px 32px rgba(0,0,0,0.5)',
        'glow-success': '0 0 16px rgba(16,185,129,0.4)',
        'glow-accent':  '0 0 16px rgba(167,139,250,0.4)',
      },

      // ── Animation durations ──────────────────────────────────────────
      transitionDuration: {
        instant:     '100ms',
        fast:        '150ms',
        normal:      '250ms',
        slow:        '400ms',
        celebration: '800ms',
      },

      // ── Easing ───────────────────────────────────────────────────────
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
        spring:  'cubic-bezier(0.5, 1.4, 0.5, 1)', // ONLY for celebrations
      },

      // ── Z-index layers ───────────────────────────────────────────────
      zIndex: {
        base:        '0',
        sticky:      '10',
        dropdown:    '20',
        tooltip:     '30',
        'modal-bg':  '40',
        modal:       '50',
        toast:       '60',
        pip:         '70',
        critical:    '9999',
      },

      // ── Animation keyframes ──────────────────────────────────────────
      keyframes: {
        'slide-up': {
          '0%':   { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        'slide-down': {
          '0%':   { transform: 'translateY(0)',    opacity: '1' },
          '100%': { transform: 'translateY(100%)', opacity: '0' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%':   { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(16,185,129,0.3)' },
          '50%':      { boxShadow: '0 0 24px rgba(16,185,129,0.7)' },
        },
      },

      animation: {
        'slide-up':   'slide-up 300ms cubic-bezier(0.5, 1.4, 0.5, 1)',
        'slide-down': 'slide-down 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        'fade-in':    'fade-in 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        'fade-out':   'fade-out 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        'glow-pulse': 'glow-pulse 600ms ease-in-out',
      },
    },
  },
};

export default preset;
