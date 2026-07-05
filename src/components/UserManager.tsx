"use client";

import { useActionState, useTransition, useState } from "react";
import { UserPlus, Power, Users } from "lucide-react";
import { createUserAction, toggleUserActiveAction } from "@/app/actions/users";
import { Card, Badge } from "@/components/ui";
import { initials } from "@/lib/utils";
import type { Role } from "@prisma/client";

interface U { id: string; name: string; email: string; role: Role; isActive: boolean; }

const ROLE_TABS: { key: Role; label: string }[] = [
  { key: "SUPER_ADMIN", label: "Super Admin" },
  { key: "ADMIN", label: "Admin" },
  { key: "MANAGER", label: "Manager" },
  { key: "SALES", label: "Sales" },
  { key: "EMPLOYEE", label: "Employee" },
];

export function UserManager({ users, meId }: { users: U[]; meId: string }) {
  const [state, formAction, pending] = useActionState(createUserAction, null);
  const [tab, setTab] = useState<Role | "ALL">("ALL");

  const count = (r: Role) => users.filter((u) => u.role === r).length;
  const shown = tab === "ALL" ? users : users.filter((u) => u.role === tab);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <div className="mb-3 flex items-center gap-2">
          <Users size={18} className="text-brand-600" />
          <h2 className="font-semibold text-slate-900">Team Members</h2>
          <span className="text-xs text-slate-400">({users.length})</span>
        </div>

        {/* role category tabs */}
        <div className="mb-3 flex flex-wrap gap-1.5 border-b border-slate-100 pb-3">
          <TabChip label="All" n={users.length} active={tab === "ALL"} onClick={() => setTab("ALL")} />
          {ROLE_TABS.map((t) => (
            <TabChip key={t.key} label={t.label} n={count(t.key)} active={tab === t.key} onClick={() => setTab(t.key)} />
          ))}
        </div>

        <div className="divide-y divide-slate-100">
          {shown.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No users in this role yet.</p>
          ) : (
            shown.map((u) => <UserRow key={u.id} u={u} meId={meId} />)
          )}
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center gap-2">
          <UserPlus size={18} className="text-brand-600" />
          <h2 className="font-semibold text-slate-900">Add User</h2>
        </div>
        <form action={formAction} className="space-y-3">
          <input name="name" className="input" placeholder="Full name" required />
          <input name="email" type="email" className="input" placeholder="email@company.com" required />
          <input name="password" type="password" className="input" placeholder="Temp password" required />
          <select name="role" className="input" defaultValue="SALES">
            {["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES", "EMPLOYEE"].map((r) => <option key={r}>{r}</option>)}
          </select>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state?.ok && <p className="text-sm text-emerald-600">User added ✅</p>}
          <button type="submit" className="btn-primary w-full" disabled={pending}>
            {pending ? "Adding…" : "Create User"}
          </button>
        </form>
      </Card>
    </div>
  );
}

function TabChip({ label, n, active, onClick }: { label: string; n: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
        active
          ? "border-brand-300 bg-brand-50 text-brand-700"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {label}
      <span className={`rounded-full px-1.5 text-[10px] ${active ? "bg-brand-200 text-brand-800" : "bg-slate-100 text-slate-500"}`}>{n}</span>
    </button>
  );
}

function UserRow({ u, meId }: { u: U; meId: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
        {initials(u.name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800">{u.name}</p>
        <p className="truncate text-xs text-slate-400">{u.email}</p>
      </div>
      <Badge value={u.role} />
      {!u.isActive && <span className="text-xs text-rose-500">inactive</span>}
      {u.id !== meId && (
        <button onClick={() => start(() => toggleUserActiveAction(u.id))} disabled={pending}
          className="btn-ghost px-2" title={u.isActive ? "Deactivate" : "Activate"}>
          <Power size={14} className={u.isActive ? "text-emerald-500" : "text-slate-400"} />
        </button>
      )}
    </div>
  );
}
