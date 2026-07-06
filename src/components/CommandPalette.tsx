"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, CornerDownLeft, LayoutDashboard, Users, UserCircle, CheckSquare,
  FileText, Receipt, MessageSquare, BarChart3, Video, UserCog, Settings, ArrowRight,
  CalendarDays, NotebookPen,
} from "lucide-react";
import type { Role } from "@prisma/client";

interface Item { id: string; title: string; sub?: string; href: string; icon?: React.ReactNode; }
interface Group { label: string; items: Item[]; }

const RANK: Record<Role, number> = { SUPER_ADMIN: 5, ADMIN: 4, MANAGER: 3, SALES: 2, EMPLOYEE: 1 };

const NAV: { title: string; href: string; icon: React.ReactNode; min: Role }[] = [
  { title: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={16} />, min: "EMPLOYEE" },
  { title: "Leads", href: "/leads", icon: <Users size={16} />, min: "SALES" },
  { title: "Customers", href: "/customers", icon: <UserCircle size={16} />, min: "SALES" },
  { title: "Tasks", href: "/tasks", icon: <CheckSquare size={16} />, min: "EMPLOYEE" },
  { title: "Calendar", href: "/calendar", icon: <CalendarDays size={16} />, min: "EMPLOYEE" },
  { title: "Notes", href: "/notes", icon: <NotebookPen size={16} />, min: "EMPLOYEE" },
  { title: "Quotations", href: "/quotations", icon: <FileText size={16} />, min: "SALES" },
  { title: "Invoices", href: "/invoices", icon: <Receipt size={16} />, min: "SALES" },
  { title: "Communication", href: "/communication", icon: <MessageSquare size={16} />, min: "SALES" },
  { title: "Meetings", href: "/meetings", icon: <Video size={16} />, min: "SALES" },
  { title: "Reports & AI", href: "/reports", icon: <BarChart3 size={16} />, min: "MANAGER" },
  { title: "My Account", href: "/account", icon: <UserCog size={16} />, min: "EMPLOYEE" },
  { title: "Settings", href: "/settings", icon: <Settings size={16} />, min: "ADMIN" },
  { title: "New Lead", href: "/leads/new", icon: <ArrowRight size={16} />, min: "SALES" },
  { title: "New Quotation", href: "/quotations/new", icon: <ArrowRight size={16} />, min: "SALES" },
  { title: "Add Customer", href: "/customers/new", icon: <ArrowRight size={16} />, min: "SALES" },
];

export function CommandPalette({ role }: { role: Role }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const nav = useMemo(() => NAV.filter((n) => RANK[role] >= RANK[n.min]), [role]);

  // open on Cmd/Ctrl+K or custom event; close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", onOpen);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("open-command-palette", onOpen); };
  }, []);

  useEffect(() => { if (open) { setQuery(""); setGroups([]); setActive(0); setTimeout(() => inputRef.current?.focus(), 30); } }, [open]);

  // debounced search
  useEffect(() => {
    if (!open) return;
    if (query.trim().length < 2) { setGroups([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, { cache: "no-store" });
        if (r.ok) setGroups((await r.json()).groups || []);
      } catch { /* ignore */ }
    }, 200);
    return () => clearTimeout(t);
  }, [query, open]);

  // build the visible list: nav (filtered) when empty, else search groups
  const navMatches = query.trim().length < 2
    ? nav
    : nav.filter((n) => n.title.toLowerCase().includes(query.trim().toLowerCase()));

  const shownGroups: Group[] = query.trim().length < 2
    ? [{ label: "Go to", items: nav.map((n) => ({ id: n.href, title: n.title, href: n.href, icon: n.icon })) }]
    : [
        ...(navMatches.length ? [{ label: "Go to", items: navMatches.map((n) => ({ id: n.href, title: n.title, href: n.href, icon: n.icon })) }] : []),
        ...groups,
      ];

  const flat = useMemo(() => shownGroups.flatMap((g) => g.items), [shownGroups]);

  const go = useCallback((href: string) => { setOpen(false); router.push(href); }, [router]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, flat.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (flat[active]) go(flat[active].href); }
  };

  useEffect(() => { setActive(0); }, [query]);

  if (!open) return null;

  let idx = -1;
  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/40 p-4 pt-[12vh] backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 dark:border-slate-700">
          <Search size={18} className="text-slate-400" />
          <input
            ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onKeyDown}
            placeholder="Search leads, customers, invoices, or jump to a page…"
            className="w-full bg-transparent py-4 text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
          />
          <kbd className="hidden rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-400 sm:block dark:border-slate-600">ESC</kbd>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-2">
          {flat.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">
              {query.trim().length < 2 ? "Type to search…" : "No results found."}
            </p>
          ) : (
            shownGroups.map((g) => (
              <div key={g.label} className="mb-1">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{g.label}</p>
                {g.items.map((it) => {
                  idx++;
                  const isActive = idx === active;
                  return (
                    <button key={g.label + it.id} onMouseEnter={() => setActive(flat.findIndex((f) => f.href === it.href && f.id === it.id))}
                      onClick={() => go(it.href)}
                      className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm ${isActive ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10" : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/50"}`}>
                      <span className="shrink-0 text-slate-400">{it.icon || <Search size={15} />}</span>
                      <span className="flex-1 truncate">{it.title}</span>
                      {it.sub && <span className="truncate text-xs text-slate-400">{it.sub}</span>}
                      {isActive && <CornerDownLeft size={14} className="text-brand-400" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
