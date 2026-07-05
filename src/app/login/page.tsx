"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";
import { Sparkles } from "lucide-react";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 p-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Sparkles size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">AI CRM</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Business Operating System</p>
          </div>
        </div>

        <form action={formAction} className="card space-y-4 p-6">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" className="input" placeholder="admin@aicrm.app" required />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" className="input" placeholder="••••••••" required />
          </div>

          {state?.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </button>

          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-medium text-slate-700">Demo logins (after seeding):</p>
            <p>Admin — admin@aicrm.app / admin123</p>
            <p>Sales — sales@aicrm.app / sales123</p>
          </div>
        </form>
      </div>
    </div>
  );
}
