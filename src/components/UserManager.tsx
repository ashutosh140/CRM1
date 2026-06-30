"use client";

import { useActionState, useTransition } from "react";
import { UserPlus, Power } from "lucide-react";
import { createUserAction, toggleUserActiveAction } from "@/app/actions/users";
import { Card, Badge } from "@/components/ui";
import { initials } from "@/lib/utils";
import type { Role } from "@prisma/client";

interface U { id: string; name: string; email: string; role: Role; isActive: boolean; }

export function UserManager({ users, meId }: { users: U[]; meId: string }) {
  const [state, formAction, pending] = useActionState(createUserAction, null);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <h2 className="mb-3 font-semibold text-slate-900">Team Members</h2>
        <div className="divide-y divide-slate-100">
          {users.map((u) => <UserRow key={u.id} u={u} meId={meId} />)}
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
          <select name="role" className="input">
            {["ADMIN", "MANAGER", "SALES", "EMPLOYEE"].map((r) => <option key={r}>{r}</option>)}
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
