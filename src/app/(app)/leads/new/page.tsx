"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createLeadAction } from "@/app/actions/leads";
import { PageHeader, Card } from "@/components/ui";

const SOURCES = ["MANUAL", "WEBSITE", "WHATSAPP", "EMAIL", "FACEBOOK", "INSTAGRAM", "PHONE", "REFERRAL"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}
function Field({ label, name, type = "text", placeholder, required, full }: {
  label: string; name: string; type?: string; placeholder?: string; required?: boolean; full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="label">{label}{required && " *"}</label>
      <input name={name} type={type} className="input" placeholder={placeholder} required={required} />
    </div>
  );
}

export default function NewLeadPage() {
  const [state, formAction, pending] = useActionState(createLeadAction, null);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/leads" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={16} /> Back to leads
      </Link>
      <PageHeader title="New Lead / Client" subtitle="AI auto-scores & auto-assigns, and a welcome email + onboarding PDF is sent on save." />

      <Card>
        <form action={formAction} className="space-y-6">
          <Section title="Contact Details">
            <Field label="Name" name="name" placeholder="Rahul Sharma" required />
            <Field label="Company" name="company" placeholder="Acme Pvt Ltd" />
            <Field label="Email" name="email" type="email" placeholder="rahul@acme.com" />
            <Field label="Phone" name="phone" placeholder="+91 98765 43210" />
            <Field label="Alternate Mobile" name="altPhone" placeholder="+91 91234 56789" />
            <div>
              <label className="label">Source</label>
              <select name="source" className="input">
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </Section>

          <Section title="Links & Social">
            <Field label="Website" name="website" placeholder="https://acme.com" />
            <Field label="Facebook" name="facebook" placeholder="https://facebook.com/acme" />
            <Field label="Instagram" name="instagram" placeholder="https://instagram.com/acme" />
            <Field label="Twitter / X" name="twitter" placeholder="https://x.com/acme" />
            <Field label="Other Links" name="otherLinks" placeholder="LinkedIn, YouTube, etc." full />
          </Section>

          <Section title="Business & Engagement">
            <Field label="Hero Products" name="heroProducts" placeholder="Main products / services they offer" full />
            <Field label="Estimated Value (₹)" name="estimatedValue" type="number" placeholder="50000" />
            <Field label="Contract Term (months)" name="contractMonths" type="number" placeholder="12" />
            <Field label="Onboarded On" name="onboardedAt" type="date" />
          </Section>

          <Section title="Requirement">
            <div className="sm:col-span-2">
              <label className="label">Reason for Inquiry</label>
              <textarea name="inquiryReason" rows={2} className="input" placeholder="Why did they reach out? What prompted the inquiry?" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Nature of Work / Product Requirement</label>
              <textarea name="productRequirement" rows={3} className="input" placeholder="What work are we doing for them? Scope, deliverables…" />
            </div>
          </Section>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Link href="/leads" className="btn-ghost">Cancel</Link>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "Saving & sending welcome…" : "Create Lead"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
