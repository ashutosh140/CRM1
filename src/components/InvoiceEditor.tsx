"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, IndianRupee } from "lucide-react";
import { updateInvoiceAction, recordPaymentAction } from "@/app/actions/invoices";
import { Card } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

const STATUSES = ["DRAFT", "SENT", "PARTIAL", "PAID", "OVERDUE", "CANCELLED"];

export function InvoiceEditor({ inv }: {
  inv: { id: string; status: string; total: number; paidAmount: number; dueDate: string | null };
}) {
  const router = useRouter();
  const [state, formAction, saving] = useActionState(async (p: unknown, fd: FormData) => {
    const r = await updateInvoiceAction(p, fd);
    if (r?.ok) router.refresh();
    return r;
  }, null);
  const [amount, setAmount] = useState("");
  const [pending, start] = useTransition();
  const due = inv.total - inv.paidAmount;

  return (
    <Card>
      <h2 className="mb-3 font-semibold text-slate-900">Manage Invoice</h2>
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="id" value={inv.id} />
        <div>
          <label className="label">Status</label>
          <select name="status" defaultValue={inv.status} className="input">
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Due Date</label>
          <input name="dueDate" type="date" defaultValue={inv.dueDate?.slice(0, 10) ?? ""} className="input" />
        </div>
        <div>
          <label className="label">Paid Amount (₹)</label>
          <input name="paidAmount" type="number" min="0" max={inv.total} defaultValue={inv.paidAmount} className="input" />
        </div>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.ok && <p className="text-sm text-emerald-600">Saved ✅</p>}
        <button type="submit" className="btn-primary w-full" disabled={saving}>
          <Save size={15} /> {saving ? "Saving…" : "Save Changes"}
        </button>
      </form>

      {due > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <label className="label">Record a payment</label>
          <div className="flex gap-2">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="0" max={due}
              className="input" placeholder={`Due: ${formatCurrency(due)}`} />
            <button className="btn-ghost" disabled={pending}
              onClick={() => start(async () => { await recordPaymentAction(inv.id, Number(amount) || 0); setAmount(""); router.refresh(); })}>
              <IndianRupee size={14} /> Add
            </button>
          </div>
          <button className="btn-primary mt-2 w-full" disabled={pending}
            onClick={() => start(async () => { await recordPaymentAction(inv.id, due); router.refresh(); })}>
            Mark Fully Paid ({formatCurrency(due)})
          </button>
        </div>
      )}
    </Card>
  );
}
