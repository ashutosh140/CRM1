"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/app/actions/profile";
import { Card } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { Role } from "@prisma/client";

export function AccountForm({
  user,
}: {
  user: { name: string; email: string; role: Role };
}) {
  const [state, formAction, pending] = useActionState(updateProfileAction, null);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <h2 className="mb-4 font-semibold text-slate-900">Profile</h2>
        <form action={formAction} className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input name="name" className="input" defaultValue={user.name} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input name="email" type="email" className="input" defaultValue={user.email} required />
          </div>
          <div>
            <label className="label">New password <span className="text-slate-400">(leave blank to keep current)</span></label>
            <input name="password" type="password" className="input" placeholder="••••••••" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Role:</span>
            <span className="badge bg-slate-100 text-slate-700">{user.role}</span>
            <span className="text-xs text-slate-400">(only an Admin can change roles)</span>
          </div>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state?.ok && <p className="text-sm text-emerald-600">Profile updated ✅</p>}

          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold text-slate-900">Appearance</h2>
        <p className="mb-3 text-sm text-slate-500">Switch between light and dark theme.</p>
        <ThemeToggle full />
      </Card>
    </div>
  );
}
