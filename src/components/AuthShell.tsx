import { Sparkles, ShieldCheck, Bot, TrendingUp, Star } from "lucide-react";

/** Premium split-screen wrapper shared by login / signup / forgot-password. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-white dark:bg-slate-950">
      {/* Left — animated brand panel (hidden on small screens) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden p-12 text-white lg:flex
                      bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4c1d95]">
        {/* ambient moving blobs */}
        <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-brand-500/30 blur-3xl animate-blob" />
        <div className="pointer-events-none absolute right-[-6rem] top-1/3 h-72 w-72 rounded-full bg-fuchsia-500/25 blur-3xl animate-blob" style={{ animationDelay: "-6s" }} />
        <div className="pointer-events-none absolute bottom-[-5rem] left-1/4 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl animate-blob" style={{ animationDelay: "-11s" }} />
        {/* subtle grid glow */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{ backgroundImage: "radial-gradient(circle at 30% 15%, rgba(255,255,255,.5), transparent 40%)" }} />

        <div className="relative flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <Sparkles size={20} />
          </div>
          <span className="text-lg font-heading font-bold">AI CRM</span>
        </div>

        {/* Mascot + headline */}
        <div className="relative">
          <div className="mb-8 flex items-end gap-4">
            <Mascot />
            <SpeechBubble />
          </div>

          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-brand-100 backdrop-blur ring-1 ring-white/15">
            <Star size={12} className="fill-amber-300 text-amber-300" /> Rated #1 for AI automation
          </span>
          <h2 className="max-w-md text-3xl font-heading font-bold leading-tight">
            Run your entire business on <span className="text-shimmer">autopilot.</span>
          </h2>
          <p className="mt-3 max-w-md text-brand-100/90">
            Leads, sales, invoices, and customer intelligence — all powered by AI, all in one secure workspace.
          </p>

          <ul className="mt-8 space-y-4 text-sm">
            <Feature delay="0.1s" icon={<Bot size={18} />} title="AI that does the work"
              text="Auto-drafted reports, replies, and next-best actions." />
            <Feature delay="0.25s" icon={<TrendingUp size={18} />} title="Everything in one place"
              text="Pipeline, tasks, chat, invoices — no tab-switching." />
            <Feature delay="0.4s" icon={<ShieldCheck size={18} />} title="Bank-grade security"
              text="Encrypted sessions, hashed passwords, role-based access." />
          </ul>
        </div>

        <p className="relative text-xs text-brand-200/80">© {`${new Date().getFullYear()}`} AI CRM · Business Operating System</p>
      </div>

      {/* Right — form area */}
      <div className="flex w-full flex-col items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-center gap-2 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Sparkles size={20} />
            </div>
            <span className="text-lg font-heading font-bold text-slate-900 dark:text-white">AI CRM</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, text, delay }: { icon: React.ReactNode; title: string; text: string; delay: string }) {
  return (
    <li className="flex gap-3 animate-fadeup" style={{ animationDelay: delay }}>
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/10">{icon}</span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-brand-100/80">{text}</p>
      </div>
    </li>
  );
}

/** Little speech bubble from the mascot — conveys the value prop. */
function SpeechBubble() {
  return (
    <div className="relative mb-4 animate-fadeup rounded-2xl rounded-bl-sm bg-white/95 px-3.5 py-2 text-sm font-medium text-indigo-900 shadow-xl"
      style={{ animationDelay: "0.5s" }}>
      Hi! I&apos;ll handle the busywork <span className="inline-block animate-floaty">🚀</span>
      <span className="absolute -bottom-1.5 left-3 h-3 w-3 rotate-45 bg-white/95" />
    </div>
  );
}

/** Friendly AI robot mascot — floats gently with a glowing halo & orbiting sparkle. */
function Mascot() {
  return (
    <div className="relative h-40 w-40 shrink-0">
      {/* pulsing halo */}
      <span className="absolute inset-2 rounded-full bg-brand-400/40 blur-md animate-ring" />
      <span className="absolute inset-0 rounded-full ring-1 ring-white/10" />
      {/* orbiting sparkle */}
      <div className="absolute inset-0 animate-spin-slow">
        <span className="absolute left-1/2 top-1 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-amber-300 shadow-[0_0_12px_4px_rgba(252,211,77,0.7)]" />
      </div>

      <div className="animate-floaty">
        <svg viewBox="0 0 240 240" className="h-40 w-40 drop-shadow-2xl" aria-hidden>
          <defs>
            <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#eef2ff" />
              <stop offset="1" stopColor="#c7d2fe" />
            </linearGradient>
            <linearGradient id="visor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#312e81" />
              <stop offset="1" stopColor="#1e1b4b" />
            </linearGradient>
            <linearGradient id="chart" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#34d399" />
              <stop offset="1" stopColor="#a7f3d0" />
            </linearGradient>
          </defs>

          {/* antenna */}
          <line x1="120" y1="34" x2="120" y2="54" stroke="#a5b4fc" strokeWidth="5" strokeLinecap="round" />
          <circle cx="120" cy="28" r="8" fill="#fcd34d">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* arms */}
          <rect x="34" y="120" width="20" height="52" rx="10" fill="url(#body)" />
          <rect x="186" y="96" width="20" height="52" rx="10" fill="url(#body)" transform="rotate(28 196 122)" />

          {/* head */}
          <rect x="60" y="52" width="120" height="96" rx="30" fill="url(#body)" />
          {/* ears */}
          <rect x="52" y="86" width="12" height="30" rx="6" fill="#a5b4fc" />
          <rect x="176" y="86" width="12" height="30" rx="6" fill="#a5b4fc" />
          {/* visor / face screen */}
          <rect x="76" y="70" width="88" height="62" rx="22" fill="url(#visor)" />
          {/* eyes (blink) */}
          <g className="animate-blink">
            <circle cx="104" cy="98" r="9" fill="#a5b4fc" />
            <circle cx="136" cy="98" r="9" fill="#a5b4fc" />
            <circle cx="106" cy="95" r="3" fill="#fff" />
            <circle cx="138" cy="95" r="3" fill="#fff" />
          </g>
          {/* smile */}
          <path d="M102 116 Q120 128 138 116" stroke="#818cf8" strokeWidth="5" fill="none" strokeLinecap="round" />

          {/* body */}
          <rect x="74" y="150" width="92" height="66" rx="24" fill="url(#body)" />
          {/* chest screen with rising chart */}
          <rect x="90" y="164" width="60" height="40" rx="10" fill="url(#visor)" />
          <polyline points="98,194 110,184 122,190 138,170" fill="none" stroke="url(#chart)" strokeWidth="4"
            strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="138" cy="170" r="3.5" fill="#a7f3d0" />
        </svg>
      </div>
    </div>
  );
}

/** "Continue with Google" — links to our OAuth start route. */
export function GoogleButton({ label = "Continue with Google" }: { label?: string }) {
  return (
    <a href="/api/auth/google"
      className="btn-ghost w-full justify-center gap-3 font-medium">
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.5 0 10.4-2.1 14.1-5.5l-6.5-5.5c-2 1.5-4.7 2.5-7.6 2.5-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.6 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.5 5.5C41.9 35.7 44 30.3 44 24c0-1.3-.1-2.3-.4-3.5z" />
      </svg>
      {label}
    </a>
  );
}
