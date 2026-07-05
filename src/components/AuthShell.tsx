import { Sparkles, ShieldCheck, Bot, TrendingUp } from "lucide-react";

/** Premium split-screen wrapper shared by login / signup / forgot-password. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-white dark:bg-slate-950">
      {/* Left — brand / marketing panel (hidden on small screens) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand-700 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 opacity-40"
          style={{ backgroundImage: "radial-gradient(circle at 20% 20%, rgba(255,255,255,.25), transparent 45%), radial-gradient(circle at 80% 80%, rgba(129,140,248,.55), transparent 45%)" }} />
        <div className="relative flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <Sparkles size={20} />
          </div>
          <span className="text-lg font-heading font-bold">AI CRM</span>
        </div>

        <div className="relative">
          <h2 className="max-w-md text-3xl font-heading font-bold leading-tight">
            Run your entire business on autopilot.
          </h2>
          <p className="mt-3 max-w-md text-brand-100">
            Leads, sales, invoices, and customer intelligence — all powered by AI, all in one secure workspace.
          </p>
          <ul className="mt-8 space-y-4 text-sm">
            <Feature icon={<Bot size={18} />} title="AI that does the work"
              text="Auto-drafted reports, replies, and next-best actions." />
            <Feature icon={<TrendingUp size={18} />} title="Everything in one place"
              text="Pipeline, tasks, chat, invoices — no tab-switching." />
            <Feature icon={<ShieldCheck size={18} />} title="Bank-grade security"
              text="Encrypted sessions, hashed passwords, role-based access." />
          </ul>
        </div>

        <p className="relative text-xs text-brand-200">© {`${new Date().getFullYear()}`} AI CRM · Business Operating System</p>
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

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">{icon}</span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-brand-100">{text}</p>
      </div>
    </li>
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
