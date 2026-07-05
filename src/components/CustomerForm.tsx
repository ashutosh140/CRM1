"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createCustomerAction } from "@/app/actions/customers";
import { Card } from "@/components/ui";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}
function Field({ label, name, type = "text", placeholder, required, full, defaultValue }: {
  label: string; name: string; type?: string; placeholder?: string; required?: boolean; full?: boolean; defaultValue?: string | number;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="label">{label}{required && " *"}</label>
      <input name={name} type={type} className="input" placeholder={placeholder} required={required} defaultValue={defaultValue} />
    </div>
  );
}

export function CustomerForm({ users }: { users: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createCustomerAction, null);

  return (
    <Card>
      <form action={formAction} className="space-y-6">
        <Section title="Contact Details">
          <Field label="Name" name="name" placeholder="Contact / Customer name" required />
          <Field label="Company" name="company" placeholder="Acme Pvt Ltd" />
          <Field label="Email" name="email" type="email" placeholder="hello@acme.com" />
          <Field label="Phone" name="phone" placeholder="+91 98765 43210" />
          <Field label="Alternate Mobile" name="altPhone" placeholder="+91 91234 56789" />
          <div>
            <label className="label">Assign owner</label>
            <select name="ownerId" className="input">
              <option value="">Me</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <Field label="Address" name="address" placeholder="City, State" full />
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
          <Field label="Lifetime Value (₹)" name="lifetimeValue" type="number" placeholder="0" defaultValue={0} />
          <Field label="Contract Term (months)" name="contractMonths" type="number" placeholder="12" />
          <Field label="Onboarded On" name="onboardedAt" type="date" />
          <Field label="Tags (comma separated)" name="tags" placeholder="VIP, Repeat, Pharma" />
        </Section>

        <Section title="Requirement">
          <div className="sm:col-span-2">
            <label className="label">Reason for Inquiry</label>
            <textarea name="inquiryReason" rows={2} className="input" placeholder="Why did they reach out? What prompted the inquiry?" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Nature of Work / Product Requirement</label>
            <textarea name="requirement" rows={3} className="input" placeholder="What work are we doing for them? Scope, deliverables…" />
          </div>
        </Section>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Link href="/customers" className="btn-ghost">Cancel</Link>
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Adding…" : "Add Customer"}
          </button>
        </div>
      </form>
    </Card>
  );
}
