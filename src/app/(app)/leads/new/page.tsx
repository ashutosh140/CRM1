"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createLeadAction } from "@/app/actions/leads";
import { PageHeader, Card } from "@/components/ui";

const SOURCES = ["MANUAL", "WEBSITE", "WHATSAPP", "EMAIL", "FACEBOOK", "INSTAGRAM", "PHONE", "REFERRAL"];

export default function NewLeadPage() {
  const [state, formAction, pending] = useActionState(createLeadAction, null);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/leads" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={16} /> Back to leads
      </Link>
      <PageHeader title="New Lead" subtitle="AI will auto-score and auto-assign this lead on save." />

      <Card>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Name *</label>
              <input name="name" className="input" required placeholder="Rahul Sharma" />
            </div>
            <div>
              <label className="label">Company</label>
              <input name="company" className="input" placeholder="Acme Pvt Ltd" />
            </div>
            <div>
              <label className="label">Email</label>
              <input name="email" type="email" className="input" placeholder="rahul@acme.com" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input name="phone" className="input" placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="label">Source</label>
              <select name="source" className="input">
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Estimated Value (₹)</label>
              <input name="estimatedValue" type="number" min="0" className="input" placeholder="50000" />
            </div>
          </div>
          <div>
            <label className="label">Product Requirement</label>
            <textarea name="productRequirement" rows={3} className="input" placeholder="Needs 50 units of Product X, delivery in 2 weeks…" />
          </div>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <div className="flex justify-end gap-2">
            <Link href="/leads" className="btn-ghost">Cancel</Link>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "Saving & scoring…" : "Create Lead"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
