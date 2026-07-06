"use client";

import { useActionState, useState } from "react";
import { KeyRound, Eye, EyeOff } from "lucide-react";
import { updateProfileAction, changePasswordAction } from "@/app/actions/profile";
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
      <div className="space-y-6 lg:col-span-2">
        {/* Profile */}
        <Card>
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

        {/* Change Password */}
        <ChangePassword />
      </div>

      {/* Appearance */}
      <Card>
        <h2 className="mb-4 font-semibold text-slate-900">Appearance</h2>
        <p className="mb-3 text-sm text-slate-500">Switch between light and dark theme.</p>
        <ThemeToggle full />
      </Card>
    </div>
  );
}

function PasswordInput({ name, placeholder }: { name: string; placeholder: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input name={name} type={show ? "text" : "password"} className="input pr-10" placeholder={placeholder} required minLength={name === "current" ? undefined : 6} />
      <button
        type="button" onClick={() => setShow((v) => !v)} tabIndex={-1}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

function ChangePassword() {
  const [state, formAction, pending] = useActionState(changePasswordAction, null);

  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <KeyRound size={18} className="text-brand-600" />
        <h2 className="font-semibold text-slate-900">Change Password</h2>
      </div>
      <p className="mb-4 text-sm text-slate-500">
        Logged in with the password your admin set? Set your own here.
      </p>
      {/* key forces the form to reset after a successful change */}
      <form key={state?.ok ? "done" : "form"} action={formAction} className="space-y-4">
        <div>
          <label className="label">Current password</label>
          <PasswordInput name="current" placeholder="••••••••" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">New password</label>
            <PasswordInput name="next" placeholder="At least 6 characters" />
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <PasswordInput name="confirm" placeholder="Re-enter new password" />
          </div>
        </div>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.ok && <p className="text-sm text-emerald-600">Password changed ✅</p>}
        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Updating…" : "Update Password"}
          </button>
        </div>
      </form>
    </Card>
  );
}
