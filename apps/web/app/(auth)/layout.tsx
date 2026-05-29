/**
 * Auth layout — centered, single-column, dark background.
 * No design system components yet (those come in M3).
 * Uses raw Tailwind only.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / wordmark */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            Focus Forge
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            A productivity toolbox for adults with ADHD
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
