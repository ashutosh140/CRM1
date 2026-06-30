"use client";

import { useTransition } from "react";
import { Send, FileCheck2, Receipt } from "lucide-react";
import { setQuotationStatusAction, convertToInvoiceAction } from "@/app/actions/quotations";
import { Badge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";

export function QuotationRow({ q }: {
  q: { id: string; number: string; status: string; total: number; createdAt: Date; customer: { name: string } };
}) {
  const [pending, start] = useTransition();
  return (
    <tr className="border-t border-slate-100">
      <td className="px-4 py-3 font-medium text-slate-800">{q.number}</td>
      <td className="px-4 py-3 text-slate-600">{q.customer.name}</td>
      <td className="px-4 py-3"><Badge value={q.status} /></td>
      <td className="px-4 py-3 text-slate-600">{formatCurrency(q.total)}</td>
      <td className="px-4 py-3 text-xs text-slate-400">{formatDate(q.createdAt)}</td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1">
          {q.status === "DRAFT" && (
            <button className="btn-ghost text-xs" disabled={pending}
              onClick={() => start(() => setQuotationStatusAction(q.id, "SENT"))}>
              <Send size={13} /> Send
            </button>
          )}
          {(q.status === "SENT" || q.status === "DRAFT") && (
            <button className="btn-ghost text-xs" disabled={pending}
              onClick={() => start(() => convertToInvoiceAction(q.id))}>
              <Receipt size={13} /> To Invoice
            </button>
          )}
          {q.status === "ACCEPTED" && (
            <span className="flex items-center gap-1 text-xs text-emerald-600"><FileCheck2 size={13} /> Accepted</span>
          )}
        </div>
      </td>
    </tr>
  );
}
