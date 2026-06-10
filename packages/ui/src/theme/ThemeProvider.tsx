/**
 * ThemeProvider
 * ─────────────────────────────────────────────────────────────────────────────
 * Sets data-theme on <html> so CSS variables respond to user preference.
 *
 * Resolution order (per 02-design-system.md §2.3):
 *   1. Explicit user choice (stored in cookie, passed as `defaultTheme`)
 *   2. OS prefers-color-scheme
 *   3. Dark (app default)
 *
 * In Next.js App Router: read the 'theme' cookie in the root server layout,
 * pass it as `defaultTheme`, and set it on <html data-theme>. This prevents
 * the flash of wrong theme on first render.
 *
 * Usage:
 *   // apps/web/app/layout.tsx
 *   const theme = (await cookies()).get('theme')?.value ?? 'dark';
 *   <html lang="en" data-theme={theme}>
 *     <body>
 *       <ThemeProvider defaultTheme={theme}>{children}</ThemeProvider>
 *     </body>
 *   </html>
 */
'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    // Persist to cookie so SSR renders the correct theme on next visit
    document.cookie = `theme=${next};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    document.documentElement.setAttribute('data-theme', next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  // Sync with OS preference on first render if no explicit choice is stored
  useEffect(() => {
    const storedTheme = document.cookie
      .split('; ')
      .find((row) => row.startsWith('theme='))
      ?.split('=')[1] as Theme | undefined;

    if (storedTheme) {
      setThemeState(storedTheme);
      document.documentElement.setAttribute('data-theme', storedTheme);
    } else {
      const osPrefers = window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark';
      setThemeState(osPrefers);
      document.documentElement.setAttribute('data-theme', osPrefers);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
