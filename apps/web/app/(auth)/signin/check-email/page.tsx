/**
 * "Check your email" confirmation page — shown after magic link is sent.
 */
export default function CheckEmailPage() {
  return (
    <div className="bg-slate-800 rounded-2xl p-8 shadow-xl text-center space-y-4">
      <div className="text-4xl">📬</div>
      <h2 className="text-xl font-semibold text-slate-100">Check your email</h2>
      <p className="text-slate-400 text-sm leading-relaxed">
        We sent a sign-in link to your email address.
        Click the link to continue — it expires in 15 minutes.
      </p>
      <p className="text-slate-500 text-xs">
        Didn&apos;t get it? Check your spam folder, or{' '}
        <a href="/signin" className="text-indigo-400 hover:text-indigo-300 underline">
          try again
        </a>.
      </p>
    </div>
  );
}
