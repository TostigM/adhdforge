import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import './globals.css';
import { ThemeProvider, ToastProvider } from '@focus-forge/ui';

export const metadata: Metadata = {
  title: 'Focus Forge',
  description: 'A productivity toolbox designed for adults with ADHD.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read theme cookie server-side to prevent flash of wrong theme
  const cookieStore = await cookies();
  const theme = (cookieStore.get('theme')?.value ?? 'dark') as 'dark' | 'light';

  return (
    <html lang="en" data-theme={theme}>
      <head>
        {/* Skip-to-content target */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
      </head>
      <body className="bg-bg-page text-text-primary min-h-screen antialiased" suppressHydrationWarning>
        {/* Skip to main content for keyboard users */}
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>
        <ThemeProvider defaultTheme={theme}>
          <ToastProvider>
            <main id="main-content">
              {children}
            </main>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
