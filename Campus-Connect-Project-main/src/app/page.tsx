'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Dynamically import ScrollSequence to avoid SSR issues with canvas/window
const ScrollSequence = dynamic(() => import('@/components/ScrollSequence'), { ssr: false });

// ---------------------------------------------------------------------------
// Nav
// ---------------------------------------------------------------------------
function Nav() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 md:px-10 py-4 mix-blend-difference"
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2">
        <div className="w-8 h-8 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
            <path
              d="M11 14H9l3-8 3 8h-2l-.5-1.5h-2L11 14zm.75-3h1.5l-.75-2.25L11.75 11z"
              fill="#0d1117"
            />
          </svg>
        </div>
        <span className="text-white font-bold text-lg tracking-tight">CampusConnect</span>
      </Link>

      {/* Links */}
      <div className="hidden md:flex items-center gap-8">
        {['Features', 'Solutions', 'Pricing'].map((item) => (
          <Link
            key={item}
            href="#"
            className="text-white text-sm font-medium hover:opacity-70 transition-opacity"
          >
            {item}
          </Link>
        ))}
      </div>

      {/* CTA */}
      <Link
        href="/login/admin"
        className="bg-white text-black text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-white/90 transition-colors"
      >
        Get Started
      </Link>
    </motion.nav>
  );
}

// ---------------------------------------------------------------------------
// Features Section
// ---------------------------------------------------------------------------
const FEATURES = [
  {
    role: 'Admin',
    title: 'Total Visibility',
    desc: 'A unified command centre — manage users, pull reports, monitor live attendance across every class, every department, in real time.',
    accent: '#4a9eff',
    glowClass: 'card-glow-blue',
    icon: '⚙️',
    href: '/login/admin',
  },
  {
    role: 'Teacher',
    title: 'Mark in Seconds',
    desc: 'One tap to open the register, one tap per student. CampusConnect handles the records, timestamps, and notifications automatically.',
    accent: '#a78bfa',
    glowClass: 'card-glow-purple',
    icon: '🖥️',
    href: '/login/teacher',
  },
  {
    role: 'Student',
    title: 'Check In. Done.',
    desc: 'View your live attendance percentage, send present requests, and receive instant feedback — all from your phone.',
    accent: '#34d399',
    glowClass: 'card-glow-green',
    icon: '📱',
    href: '/login/student',
  },
] as const;

function FeaturesSection() {
  return (
    <section className="bg-[#0d1117] py-32 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="text-center mb-20"
        >
          <p className="text-sm text-white/40 uppercase tracking-[0.3em] font-medium mb-4">
            Built for every role
          </p>
          <h2 className="text-5xl md:text-6xl font-black text-white leading-tight">
            One platform.{' '}
            <span
              style={{
                background: 'linear-gradient(120deg, #4a9eff, #a78bfa, #34d399)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Three experiences.
            </span>
          </h2>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <motion.a
              key={f.role}
              href={f.href}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: i * 0.12, ease: 'easeOut' }}
              className={`relative group bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 overflow-hidden hover:-translate-y-1 transition-all duration-500 cursor-pointer ${f.glowClass}`}
            >
              {/* Accent glow top-left */}
              <div
                className="absolute -top-12 -left-12 w-40 h-40 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity"
                style={{ background: f.accent }}
              />

              <span className="text-4xl mb-6 block">{f.icon}</span>
              <p
                className="text-xs uppercase tracking-[0.25em] font-bold mb-2"
                style={{ color: f.accent }}
              >
                {f.role}
              </p>
              <h3 className="text-2xl font-black text-white mb-4">{f.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>

              {/* Animated underline */}
              <div className="mt-8 h-px bg-white/5 relative overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 h-full"
                  style={{ background: f.accent }}
                  initial={{ width: 0 }}
                  whileHover={{ width: '100%' }}
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                />
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// AI Callout Section
// ---------------------------------------------------------------------------
const TERMINAL_LINES = [
  { text: 'POST /api/timetable/extract', color: '#4a9eff' },
  { text: 'Content-Type: multipart/form-data', color: '#ffffff50' },
  { text: '', color: '' },
  { text: '→ Uploading schedule image...', color: '#a78bfa' },
  { text: '→ Gemini 1.5 Flash processing...', color: '#a78bfa' },
  { text: '→ Parsing 18 timetable entries...', color: '#a78bfa' },
  { text: '', color: '' },
  { text: 'HTTP/1.1 200 OK', color: '#34d399' },
  { text: '{', color: '#ffffff' },
  { text: '  "status": "success",', color: '#ffffff80' },
  { text: '  "entries": 18,', color: '#ffffff80' },
  { text: '  "confidence": 0.97', color: '#ffffff80' },
  { text: '}', color: '#ffffff' },
];

function AICallout() {
  return (
    <section className="bg-[#0a0e16] py-32 px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        {/* Left — Copy */}
        <motion.div
          initial={{ opacity: 0, x: -32 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <p className="text-xs text-[#4a9eff] uppercase tracking-[0.3em] font-bold mb-4">
            AI-Powered Timetable Extraction
          </p>
          <h2 className="text-4xl md:text-5xl font-black text-white leading-tight mb-6">
            Upload a photo.
            <br />
            <span
              style={{
                background: 'linear-gradient(120deg, #4a9eff, #a78bfa)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Timetable done.
            </span>
          </h2>
          <p className="text-white/50 text-lg leading-relaxed mb-8">
            Snap a photo of any handwritten or printed timetable. CampusConnect&apos;s Gemini 1.5
            Flash integration extracts every class, every room, every lecturer — structured and
            ready in seconds.
          </p>
          <ul className="space-y-3">
            {[
              'Handwritten timetable recognition',
              'Automatic conflict detection',
              'Instant assignment to student groups',
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-white/60 text-sm">
                <span className="w-5 h-5 rounded-full bg-[#4a9eff]/20 flex items-center justify-center text-[#4a9eff] text-xs flex-shrink-0">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Right — Terminal card */}
        <motion.div
          initial={{ opacity: 0, x: 32 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
          className="relative"
        >
          {/* Glow */}
          <div className="absolute inset-0 -m-6 bg-[#4a9eff]/10 blur-3xl rounded-3xl" />

          <div className="relative bg-[#0d1117] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
            {/* Terminal header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.03] border-b border-white/[0.06]">
              <span className="w-3 h-3 rounded-full bg-red-500/70" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <span className="w-3 h-3 rounded-full bg-green-500/70" />
              <span className="ml-4 text-white/30 text-xs font-mono">CampusConnect API</span>
            </div>

            {/* Lines */}
            <div className="p-5 font-mono text-sm space-y-0.5">
              {TERMINAL_LINES.map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.3 }}
                  style={{ color: line.color || 'transparent' }}
                  className="leading-6"
                >
                  {line.text || '\u00A0'}
                </motion.div>
              ))}
              {/* Blinking cursor */}
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="inline-block w-2 h-4 bg-[#4a9eff] align-middle"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Final CTA
// ---------------------------------------------------------------------------
function FinalCTA() {
  return (
    <section className="bg-[#0d1117] py-40 px-6 text-center relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] bg-[#4a9eff]/8 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="relative"
      >
        <p className="text-xs text-white/30 uppercase tracking-[0.4em] font-medium mb-6">
          The future is already here
        </p>
        <h2 className="text-5xl md:text-7xl font-black text-white leading-tight mb-8">
          Your campus.
          <br />
          Finally intelligent.
        </h2>
        <p className="text-white/40 text-xl mb-12 max-w-xl mx-auto">
          Join campuses that have already left the paper trail behind.
        </p>
        <Link
          href="/login/admin"
          className="inline-block bg-white text-black font-bold text-base px-10 py-4 rounded-full hover:bg-[#4a9eff] hover:text-white transition-all duration-300 shadow-xl shadow-white/10 hover:shadow-[#4a9eff]/30"
        >
          Get Started Free
        </Link>
      </motion.div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------
function Footer() {
  return (
    <footer className="bg-[#0a0e16] border-t border-white/[0.06] py-10 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5 opacity-60">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
          </svg>
          <span className="text-white/40 text-sm font-medium">CampusConnect</span>
        </div>
        <p className="text-white/25 text-sm">© 2026 CampusConnect. All rights reserved.</p>
        <div className="flex gap-6">
          {['Privacy', 'Terms', 'Contact'].map((item) => (
            <Link key={item} href="#" className="text-white/30 text-sm hover:text-white/60 transition-colors">
              {item}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function Home() {
  return (
    <main className="bg-[#0d1117]">
      <Nav />
      <ScrollSequence />
      <FeaturesSection />
      <AICallout />
      <FinalCTA />
      <Footer />
    </main>
  );
}
