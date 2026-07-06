"use client";

import { Search } from "lucide-react";

/** A discoverable pill that opens the ⌘K command palette. */
export function SearchTrigger() {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-400 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
    >
      <Search size={15} />
      <span className="hidden sm:inline">Search…</span>
      <kbd className="ml-1 hidden rounded border border-slate-300 px-1.5 text-[10px] text-slate-400 sm:inline dark:border-slate-600">⌘K</kbd>
    </button>
  );
}
