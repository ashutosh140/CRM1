"use client";

import { useState } from "react";
import Link from "next/link";
import { useActionState } from "react";
import { requestResetAction, resetPasswordAction } from "@/app/actions/auth";
import { AuthShell } from "@/components/AuthShell";
import { MailCheck } from "lucide-react";

export default function ForgotPasswordPage() {
  const [reqState, requestAction, reqPending] = useActionState(requestResetAction, null);
  const [resState, resetAction, resPending] = useActionState(resetPasswordAction, null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  // Once the OTP email is sent, move to step 2.
  if (reqState?.ok && sentTo === null) setSentTo(reqState.email || "your email");

  return (
    <AuthShell>
      {sentTo === null ? (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-white">Forgot password?</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Enter your email and we&apos;ll send you a verification code.
            </p>
          </div>
          <form action={requestAction} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" name="email" type="email" autoComplete="email" className="input" placeholder="you@company.com" required />
            </div>
            {reqState?.error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{reqState.error}</p>
            )}
            <button type="submit" className="btn-primary w-full" disabled={reqPending}>
              {reqPending ? "Sending code…" : "Send verification code"}
            </button>
          </form>
        </>
      ) : (
        <>
          <div className="mb-6">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15">
              <MailCheck size={22} />
            </div>
            <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-white">Check your email</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              We sent a 6-digit code to <b className="text-slate-700 dark:text-slate-200">{sentTo}</b>. Enter it below with your new password. The code expires in 10 minutes.
            </p>
          </div>
          <form action={resetAction} className="space-y-4">
            <div>
              <label className="label" htmlFor="otp">Verification code</label>
              <input id="otp" name="otp" inputMode="numeric" maxLength={6} className="input text-center text-lg tracking-[0.5em]" placeholder="000000" required />
            </div>
            <div>
              <label className="label" htmlFor="password">New password</label>
              <input id="password" name="password" type="password" autoComplete="new-password" className="input" placeholder="At least 6 characters" required minLength={6} />
            </div>
            <div>
              <label className="label" htmlFor="confirm">Confirm new password</label>
              <input id="confirm" name="confirm" type="password" autoComplete="new-password" className="input" placeholder="Re-enter new password" required minLength={6} />
            </div>
            {resState?.error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{resState.error}</p>
            )}
            <button type="submit" className="btn-primary w-full" disabled={resPending}>
              {resPending ? "Resetting…" : "Reset password & sign in"}
            </button>
            <button type="button" onClick={() => setSentTo(null)} className="w-full text-center text-xs text-slate-500 hover:underline">
              Use a different email
            </button>
          </form>
        </>
      )}

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:underline">Back to sign in</Link>
      </p>
    </AuthShell>
  );
}
