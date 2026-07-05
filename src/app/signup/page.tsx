import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";

export default function SignupPage() {
  return (
    <AuthShell>
      <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-500/15">
        <ShieldCheck size={22} />
      </div>
      <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-white">Invite-only access</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        This CRM does not allow public sign-ups. Only accounts created by your administrator can sign in.
        If you need access, please contact your admin to have an account created for you.
      </p>
      <Link href="/login" className="btn-primary mt-6 w-full">Back to sign in</Link>
    </AuthShell>
  );
}
