"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { createQuotationAction } from "@/app/actions/quotations";
import { Card } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

interface Row { description: string; qty: number; unitPrice: number; }

export function QuotationForm({
  customers,
}: {
  customers: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(createQuotationAction, null);
  const [rows, setRows] = useState<Row[]>([{ description: "", qty: 1, unitPrice: 0 }]);
  const [taxRate, setTaxRate] = useState(18);

  const subtotal = rows.reduce((s, r) => s + r.qty * r.unitPrice, 0);
  const tax = Math.round((subtotal * taxRate) / 100);
  const total = subtotal + tax;

  function update(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  return (
    <Card>
      <form action={formAction} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Customer *</label>
            <select name="customerId" className="input" required>
              <option value="">Select customer…</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Tax Rate (%)</label>
            <input name="taxRate" type="number" className="input" value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value) || 0)} />
          </div>
        </div>

        <div>
          <label className="label">Line Items</label>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="flex gap-2">
                <input name="itemDescription" className="input flex-1" placeholder="Item / service description"
                  value={r.description} onChange={(e) => update(i, { description: e.target.value })} />
                <input name="itemQty" type="number" min="0" className="input w-20" placeholder="Qty"
                  value={r.qty} onChange={(e) => update(i, { qty: Number(e.target.value) || 0 })} />
                <input name="itemPrice" type="number" min="0" className="input w-28" placeholder="Unit ₹"
                  value={r.unitPrice} onChange={(e) => update(i, { unitPrice: Number(e.target.value) || 0 })} />
                <button type="button" onClick={() => setRows((p) => p.filter((_, idx) => idx !== i))}
                  className="btn-ghost px-2" disabled={rows.length === 1}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setRows((p) => [...p, { description: "", qty: 1, unitPrice: 0 }])}
            className="btn-ghost mt-2 text-xs">
            <Plus size={14} /> Add item
          </button>
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea name="notes" rows={2} className="input" placeholder="Terms, delivery, validity…" />
        </div>

        <div className="flex flex-col items-end gap-1 border-t border-slate-100 pt-4 text-sm">
          <span className="text-slate-500">Subtotal: <b className="text-slate-800">{formatCurrency(subtotal)}</b></span>
          <span className="text-slate-500">Tax ({taxRate}%): <b className="text-slate-800">{formatCurrency(tax)}</b></span>
          <span className="text-base text-slate-700">Total: <b className="text-brand-700">{formatCurrency(total)}</b></span>
        </div>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <div className="flex justify-end gap-2">
          <Link href="/quotations" className="btn-ghost">Cancel</Link>
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Generating…" : "Generate Quotation"}
          </button>
        </div>
      </form>
    </Card>
  );
}
