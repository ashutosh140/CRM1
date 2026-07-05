"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check } from "lucide-react";

interface Note { id: string; title: string; body: string | null; link: string | null; read: boolean; createdAt: string; }

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Note[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const r = await fetch("/api/notifications", { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      setItems(d.items || []); setUnread(d.unread || 0);
    } catch { /* ignore */ }
  }

  useEffect(() => {
    load();
    const i = setInterval(load, 15000);
    return () => clearInterval(i);
  }, []);

  // close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function openItem(n: Note) {
    setOpen(false);
    await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: n.id }) });
    setUnread((u) => Math.max(0, u - (n.read ? 0 : 1)));
    if (n.link) router.push(n.link);
  }
  async function markAll() {
    await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    setUnread(0); setItems((l) => l.map((x) => ({ ...x, read: true })));
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => { setOpen((o) => !o); if (!open) load(); }} className="btn-ghost relative px-2.5" title="Notifications">
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-2xl dark:bg-slate-800">
          <div className="flex items-center justify-between border-b border-slate-100 p-3">
            <span className="text-sm font-semibold text-slate-800">Notifications</span>
            {unread > 0 && <button onClick={markAll} className="flex items-center gap-1 text-xs text-brand-600 hover:underline"><Check size={12} /> Mark all read</button>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-400">No notifications yet.</p>
            ) : items.map((n) => (
              <button key={n.id} onClick={() => openItem(n)}
                className={`flex w-full items-start gap-2 border-b border-slate-50 p-3 text-left hover:bg-slate-50 ${n.read ? "" : "bg-brand-50/40"}`}>
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rose-500" />}
                <div className={`min-w-0 flex-1 ${n.read ? "pl-4" : ""}`}>
                  <p className="text-sm font-medium text-slate-800">{n.title}</p>
                  {n.body && <p className="truncate text-xs text-slate-500">{n.body}</p>}
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {new Date(n.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
