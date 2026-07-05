"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createCustomerAction } from "@/app/actions/customers";
import { Card } from "@/components/ui";

export function CustomerForm({ users }: { users: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createCustomerAction, null);

  return (
    <Card>
      <form action={formAction} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Name *</label>
            <input name="name" className="input" placeholder="Contact / Customer name" required />
          </div>
          <div>
            <label className="label">Company</label>
            <input name="company" className="input" placeholder="Acme Pvt Ltd" />
          </div>
          <div>
            <label className="label">Email</label>
            <input name="email" type="email" className="input" placeholder="hello@acme.com" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input name="phone" className="input" placeholder="+91 98765 43210" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Address</label>
            <input name="address" className="input" placeholder="City, State" />
          </div>
          <div>
            <label className="label">Assign owner</label>
            <select name="ownerId" className="input">
              <option value="">Me</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Tags (comma separated)</label>
            <input name="tags" className="input" placeholder="VIP, Repeat, Pharma" />
          </div>
          <div>
            <label className="label">Health Score (0-100)</label>
            <input name="healthScore" type="number" min="0" max="100" defaultValue={60} className="input" />
          </div>
          <div>
            <label className="label">Lifetime Value (₹)</label>
            <input name="lifetimeValue" type="number" min="0" defaultValue={0} className="input" />
          </div>
        </div>

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
