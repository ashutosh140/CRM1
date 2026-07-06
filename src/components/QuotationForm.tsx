"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, FileText } from "lucide-react";
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
  const [discount, setDiscount] = useState(0);

  const subtotal = rows.reduce((s, r) => s + r.qty * r.unitPrice, 0);
  const discounted = Math.max(0, subtotal - discount);
  const tax = Math.round((discounted * taxRate) / 100);
  const total = discounted + tax;

  function update(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  return (
    <Card>
      <form action={formAction} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label className="label">Customer *</label>
            <select name="customerId" className="input" required>
              <option value="">Select customer…</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Tax Rate (%)</label>
            <input name="taxRate" type="number" min="0" className="input" value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value) || 0)} />
          </div>
          <div>
            <label className="label">Valid until</label>
            <input name="validUntil" type="date" className="input" />
          </div>
        </div>

        <div>
          <label className="label">Line Items</label>
          {/* column headers */}
          <div className="mb-1 hidden gap-2 px-1 text-[11px] font-medium uppercase text-slate-400 sm:flex">
            <span className="flex-1">Description</span>
            <span className="w-20 text-center">Qty</span>
            <span className="w-28 text-center">Unit Price</span>
            <span className="w-28 text-right">Amount</span>
            <span className="w-9" />
          </div>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                <input name="itemDescription" className="input min-w-[140px] flex-1" placeholder="Item / service description"
                  value={r.description} onChange={(e) => update(i, { description: e.target.value })} />
                <input name="itemQty" type="number" min="0" className="input w-20 text-center" placeholder="Qty"
                  value={r.qty} onChange={(e) => update(i, { qty: Number(e.target.value) || 0 })} />
                <input name="itemPrice" type="number" min="0" className="input w-28 text-center" placeholder="Unit ₹"
                  value={r.unitPrice} onChange={(e) => update(i, { unitPrice: Number(e.target.value) || 0 })} />
                <span className="w-28 text-right text-sm font-medium text-slate-700">{formatCurrency(r.qty * r.unitPrice)}</span>
                <button type="button" onClick={() => setRows((p) => p.filter((_, idx) => idx !== i))}
                  className="btn-ghost w-9 px-2" disabled={rows.length === 1} title="Remove item">
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Discount (₹)</label>
            <input name="discount" type="number" min="0" className="input" value={discount}
              onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))} placeholder="0" />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea name="notes" rows={2} className="input" placeholder="Terms, delivery, validity…" />
          </div>
        </div>

        <div className="flex justify-end">
          <div className="w-full max-w-xs space-y-1.5 border-t border-slate-100 pt-4 text-sm">
            <Line label="Subtotal" value={formatCurrency(subtotal)} />
            {discount > 0 && <Line label="Discount" value={`− ${formatCurrency(discount)}`} accent="rose" />}
            <Line label={`Tax (${taxRate}%)`} value={formatCurrency(tax)} />
            <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-base">
              <span className="font-medium text-slate-700">Total</span>
              <span className="font-bold text-brand-700">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <div className="flex justify-end gap-2">
          <Link href="/quotations" className="btn-ghost">Cancel</Link>
          <button type="submit" className="btn-primary" disabled={pending}>
            <FileText size={16} /> {pending ? "Generating…" : "Generate Quotation"}
          </button>
        </div>
      </form>
    </Card>
  );
}

function Line({ label, value, accent }: { label: string; value: string; accent?: "rose" }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={accent === "rose" ? "text-rose-600" : "text-slate-800"}>{value}</span>
    </div>
  );
}
