import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen w-full">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col p-12 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #0f172a 100%)' }}>
        {/* Animated background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-10 right-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-blob" />
          <div className="absolute bottom-10 left-10 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-blob" style={{ animationDelay: '5s' }} />
          <div className="absolute top-1/2 left-1/3 w-60 h-60 bg-cyan-500/8 rounded-full blur-3xl animate-blob" style={{ animationDelay: '10s' }} />
          {/* Grid dots */}
          <div className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
        </div>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 relative z-10 group">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
            <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3z" /></svg>
          </div>
          <span className="font-bold text-xl">CampusConnect</span>
        </Link>

        {/* Center content */}
        <div className="flex-1 flex flex-col justify-center relative z-10">
          <h2 className="text-4xl font-bold leading-tight mb-4 fade-in-up">
            Smart Attendance,<br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent bg-[length:200%_auto]" style={{ animation: 'text-gradient-shift 4s ease infinite' }}>
              Simply Managed.
            </span>
          </h2>
          <p className="text-slate-400 text-lg max-w-sm fade-in-up stagger-1">
            An intelligent, real-time solution to streamline attendance tracking.
          </p>
          <div className="mt-12 space-y-4">
            {['Real-time attendance tracking', 'Role-based secure access', 'Instant reports & analytics'].map((feature, i) => (
              <div key={feature} className="flex items-center gap-3 fade-in-up" style={{ animationDelay: `${(i + 2) * 150}ms` }}>
                <div className="w-7 h-7 rounded-full bg-gradient-to-r from-blue-500/30 to-cyan-500/30 border border-blue-400/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <span className="text-slate-300 text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-slate-600 text-xs relative z-10">&copy; 2026 CampusConnect</p>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50/30 p-6 sm:p-10">
        <div className="w-full max-w-md fade-in-up">
          <Link href="/" className="flex items-center gap-2 justify-center mb-8 lg:hidden">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3z" /></svg>
            </div>
            <span className="font-bold text-xl text-slate-900">CampusConnect</span>
          </Link>
          {children}
        </div>
      </div>
    </main>
  );
}
