"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { loginAction } from "@/app/actions/auth";
import { AuthShell, GoogleButton } from "@/components/AuthShell";

function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, null);
  const [showPw, setShowPw] = useState(false);
  const params = useSearchParams();
  const urlError = params.get("error");

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-white">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Sign in to your workspace to continue.</p>
      </div>

      <GoogleButton />

      <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" /> or continue with email <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
      </div>

      <form action={formAction} className="space-y-4" autoComplete="off">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="off" className="input" placeholder="Email" required />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="label mb-0" htmlFor="password">Password</label>
            <Link href="/forgot-password" className="text-xs font-medium text-brand-600 hover:underline">Forgot password?</Link>
          </div>
          <div className="relative">
            <input
              id="password" name="password" type={showPw ? "text" : "password"}
              autoComplete="new-password" className="input pr-10" placeholder="Password" required
            />
            <button
              type="button" onClick={() => setShowPw((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label={showPw ? "Hide password" : "Show password"} tabIndex={-1}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {(state?.error || urlError) && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{state?.error || urlError}</p>
        )}

        <button type="submit" className="btn-primary w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
        This is a private, invite-only workspace. Accounts are created by your administrator.
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
