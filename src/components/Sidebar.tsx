"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, UserCircle, CheckSquare,
  FileText, Receipt, MessageSquare, BarChart3, Sparkles, Settings, Video, UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, min: "EMPLOYEE" },
  { href: "/leads", label: "Leads", icon: Users, min: "SALES" },
  { href: "/customers", label: "Customers", icon: UserCircle, min: "SALES" },
  { href: "/tasks", label: "Tasks", icon: CheckSquare, min: "EMPLOYEE" },
  { href: "/quotations", label: "Quotations", icon: FileText, min: "SALES" },
  { href: "/invoices", label: "Invoices", icon: Receipt, min: "SALES" },
  { href: "/communication", label: "Communication", icon: MessageSquare, min: "SALES" },
  { href: "/meetings", label: "Meetings", icon: Video, min: "SALES" },
  { href: "/reports", label: "Reports & AI", icon: BarChart3, min: "MANAGER" },
  { href: "/account", label: "My Account", icon: UserCog, min: "EMPLOYEE" },
  { href: "/settings", label: "Settings", icon: Settings, min: "ADMIN" },
] as const;

const RANK: Record<Role, number> = { SUPER_ADMIN: 5, ADMIN: 4, MANAGER: 3, SALES: 2, EMPLOYEE: 1 };

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  // poll unread chat count for the Communication badge
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/chat/unread", { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        if (alive) setUnread(d.count || 0);
      } catch { /* ignore */ }
    };
    load();
    const i = setInterval(load, 10000);
    return () => { alive = false; clearInterval(i); };
  }, [pathname]);

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
          <Sparkles size={18} />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight text-slate-900">AI CRM</p>
          <p className="text-[10px] text-slate-400">Business OS</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV.filter((n) => RANK[role] >= RANK[n.min as Role]).map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon size={18} />
              <span className="flex-1">{item.label}</span>
              {item.href === "/communication" && unread > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-semibold text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
