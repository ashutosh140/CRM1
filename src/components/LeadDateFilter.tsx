"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays } from "lucide-react";

const PRESETS = [
  { key: "", label: "All time" },
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
];

export function LeadDateFilter() {
  const router = useRouter();
  const params = useSearchParams();
  const activeDate = params.get("date") ?? "";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const customActive = Boolean(from || to);

  function go(next: URLSearchParams) {
    router.replace(`/leads?${next.toString()}`);
  }
  function setPreset(key: string) {
    const sp = new URLSearchParams(Array.from(params.entries()));
    sp.delete("from"); sp.delete("to");
    if (key) sp.set("date", key); else sp.delete("date");
    go(sp);
  }
  function setRange(field: "from" | "to", val: string) {
    const sp = new URLSearchParams(Array.from(params.entries()));
    sp.delete("date");
    if (val) sp.set(field, val); else sp.delete(field);
    go(sp);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <CalendarDays size={15} className="text-slate-400" />
      {PRESETS.map((p) => {
        const active = !customActive && activeDate === p.key;
        return (
          <button
            key={p.key || "all"}
            onClick={() => setPreset(p.key)}
            className={`badge border ${active ? "border-brand-300 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-600"}`}
          >
            {p.label}
          </button>
        );
      })}
      <span className="mx-1 text-xs text-slate-400">or</span>
      <input type="date" value={from} onChange={(e) => setRange("from", e.target.value)}
        className="input h-8 w-auto py-1 text-xs" title="From date" />
      <span className="text-xs text-slate-400">→</span>
      <input type="date" value={to} onChange={(e) => setRange("to", e.target.value)}
        className="input h-8 w-auto py-1 text-xs" title="To date" />
    </div>
  );
}
