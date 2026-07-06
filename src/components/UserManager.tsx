"use client";

import { useActionState, useTransition, useState, useEffect } from "react";
import { UserPlus, Power, Users, Pencil, Trash2, X } from "lucide-react";
import { createUserAction, updateUserAction, deleteUserAction, toggleUserActiveAction } from "@/app/actions/users";
import { Card, Badge } from "@/components/ui";
import { initials } from "@/lib/utils";
import type { Role } from "@prisma/client";

interface U {
  id: string; name: string; email: string; role: Role; isActive: boolean;
  phone?: string | null; aadhaar?: string | null; pan?: string | null;
}

const RANK: Record<Role, number> = { SUPER_ADMIN: 5, ADMIN: 4, MANAGER: 3, SALES: 2, EMPLOYEE: 1 };
const ROLE_OPTIONS: Role[] = ["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES", "EMPLOYEE"];

const ROLE_TABS: { key: Role; label: string }[] = [
  { key: "SUPER_ADMIN", label: "Super Admin" },
  { key: "ADMIN", label: "Admin" },
  { key: "MANAGER", label: "Manager" },
  { key: "SALES", label: "Sales" },
  { key: "EMPLOYEE", label: "Employee" },
];

/** roles the current user is allowed to assign */
function assignableRoles(meRole: Role): Role[] {
  return ROLE_OPTIONS.filter((r) => meRole === "SUPER_ADMIN" || RANK[r] < RANK[meRole]);
}
/** can the current user edit/delete this target? */
function canManage(meRole: Role, target: U, meId: string) {
  if (target.id === meId) return false;
  return meRole === "SUPER_ADMIN" || RANK[target.role] < RANK[meRole];
}

export function UserManager({ users, meId, meRole }: { users: U[]; meId: string; meRole: Role }) {
  const [state, formAction, pending] = useActionState(createUserAction, null);
  const [tab, setTab] = useState<Role | "ALL">("ALL");
  const [editing, setEditing] = useState<U | null>(null);

  const count = (r: Role) => users.filter((u) => u.role === r).length;
  const shown = tab === "ALL" ? users : users.filter((u) => u.role === tab);
  const roles = assignableRoles(meRole);

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
            shown.map((u) => (
              <UserRow key={u.id} u={u} meId={meId} meRole={meRole} onEdit={() => setEditing(u)} />
            ))
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
          <input name="phone" className="input" placeholder="Mobile number" />
          <div className="grid grid-cols-2 gap-2">
            <input name="aadhaar" className="input" placeholder="Aadhaar no." />
            <input name="pan" className="input" placeholder="PAN no." />
          </div>
          <input name="password" type="text" className="input" placeholder="First-time password" required />
          <select name="role" className="input" defaultValue={roles.includes("SALES") ? "SALES" : roles[roles.length - 1]}>
            {roles.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
          </select>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state?.ok && <p className="text-sm text-emerald-600">User added ✅ — a login email was sent.</p>}
          <button type="submit" className="btn-primary w-full" disabled={pending}>
            {pending ? "Adding…" : "Create User"}
          </button>
          <p className="text-center text-[11px] text-slate-400">
            The new user gets an email with their login link & temporary password.
          </p>
        </form>
      </Card>

      {editing && (
        <EditUserModal u={editing} meRole={meRole} isSelf={editing.id === meId} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function TabChip({ label, n, active, onClick }: { label: string; n: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
        active ? "border-brand-300 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {label}
      <span className={`rounded-full px-1.5 text-[10px] ${active ? "bg-brand-200 text-brand-800" : "bg-slate-100 text-slate-500"}`}>{n}</span>
    </button>
  );
}

function UserRow({ u, meId, meRole, onEdit }: { u: U; meId: string; meRole: Role; onEdit: () => void }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const manage = canManage(meRole, u, meId);

  function del() {
    if (!confirm(`Delete ${u.name}? This permanently removes their account.`)) return;
    start(async () => {
      const r = await deleteUserAction(u.id);
      if (r?.error) { setErr(r.error); setTimeout(() => setErr(null), 4000); }
    });
  }

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
        {initials(u.name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800">{u.name}</p>
        <p className="truncate text-xs text-slate-400">
          {u.email}{u.phone ? ` · ${u.phone}` : ""}
        </p>
        {err && <p className="text-xs text-rose-500">{err}</p>}
      </div>
      <Badge value={u.role} />
      {!u.isActive && <span className="text-xs text-rose-500">inactive</span>}

      {/* edit self (profile) or anyone you manage */}
      {(manage || u.id === meId) && (
        <button onClick={onEdit} className="btn-ghost px-2" title="Edit"><Pencil size={14} className="text-slate-500" /></button>
      )}
      {u.id !== meId && (
        <button onClick={() => start(() => toggleUserActiveAction(u.id))} disabled={pending}
          className="btn-ghost px-2" title={u.isActive ? "Deactivate" : "Activate"}>
          <Power size={14} className={u.isActive ? "text-emerald-500" : "text-slate-400"} />
        </button>
      )}
      {manage && (
        <button onClick={del} disabled={pending} className="btn-ghost px-2" title="Delete">
          <Trash2 size={14} className="text-rose-500" />
        </button>
      )}
    </div>
  );
}

function EditUserModal({ u, meRole, isSelf, onClose }: { u: U; meRole: Role; isSelf: boolean; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(updateUserAction, null);
  const roles = assignableRoles(meRole);
  // ensure the user's current role stays selectable even if not normally assignable
  const roleChoices = roles.includes(u.role) ? roles : [u.role, ...roles];

  useEffect(() => { if (state?.ok) onClose(); }, [state, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-800" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-white">Edit — {u.name}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="id" value={u.id} />
          <div>
            <label className="label">Full name</label>
            <input name="name" defaultValue={u.name} className="input" required />
          </div>
          <div>
            <label className="label">Email</label>
            <input name="email" type="email" defaultValue={u.email} className="input" required />
          </div>
          <div>
            <label className="label">Mobile number</label>
            <input name="phone" defaultValue={u.phone ?? ""} className="input" placeholder="e.g. +91 98xxxxxx" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Aadhaar no.</label>
              <input name="aadhaar" defaultValue={u.aadhaar ?? ""} className="input" />
            </div>
            <div>
              <label className="label">PAN no.</label>
              <input name="pan" defaultValue={u.pan ?? ""} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Role {isSelf && <span className="text-slate-400">(can't change your own)</span>}</label>
            <select name="role" defaultValue={u.role} className="input" disabled={isSelf}>
              {roleChoices.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Reset password <span className="text-slate-400">(optional)</span></label>
            <input name="password" type="text" className="input" placeholder="Leave blank to keep current" />
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Save changes"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
