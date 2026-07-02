"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ full = false }: { full?: boolean }) {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
  }

  if (!mounted) return null;

  if (full) {
    return (
      <button onClick={toggle} className="btn-ghost w-full justify-between">
        <span className="flex items-center gap-2">
          {dark ? <Moon size={16} /> : <Sun size={16} />}
          {dark ? "Dark mode" : "Light mode"}
        </span>
        <span className={`relative h-5 w-9 rounded-full transition ${dark ? "bg-brand-600" : "bg-slate-300"}`}>
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${dark ? "left-[18px]" : "left-0.5"}`} />
        </span>
      </button>
    );
  }

  return (
    <button onClick={toggle} className="btn-ghost px-2.5" title="Toggle theme">
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
