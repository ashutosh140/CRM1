"use client";

import { useTransition } from "react";
import { IndianRupee } from "lucide-react";
import { recordPaymentAction } from "@/app/actions/invoices";
import { Badge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";

export function InvoiceRow({ inv }: {
  inv: {
    id: string; number: string; status: string; total: number; paidAmount: number;
    dueDate: Date | null; customer: { name: string };
  };
}) {
  const [pending, start] = useTransition();
  const due = inv.total - inv.paidAmount;
  return (
    <tr className="border-t border-slate-100">
      <td className="px-4 py-3 font-medium text-slate-800">{inv.number}</td>
      <td className="px-4 py-3 text-slate-600">{inv.customer.name}</td>
      <td className="px-4 py-3"><Badge value={inv.status} /></td>
      <td className="px-4 py-3 text-slate-600">{formatCurrency(inv.total)}</td>
      <td className="px-4 py-3 text-slate-600">{formatCurrency(due)}</td>
      <td className="px-4 py-3 text-xs text-slate-400">{formatDate(inv.dueDate)}</td>
      <td className="px-4 py-3 text-right">
        {due > 0 && (
          <button className="btn-ghost text-xs" disabled={pending}
            onClick={() => start(() => recordPaymentAction(inv.id, due))}>
            <IndianRupee size={13} /> Mark Paid
          </button>
        )}
      </td>
    </tr>
  );
}
