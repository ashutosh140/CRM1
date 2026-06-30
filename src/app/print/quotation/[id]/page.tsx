import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PrintButton } from "@/components/PrintButton";

interface QItem { description: string; qty: number; unitPrice: number; }

export default async function QuotationPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const q = await prisma.quotation.findUnique({
    where: { id },
    include: { customer: true },
  });
  if (!q) notFound();
  const items = q.items as unknown as QItem[];

  return (
    <div className="mx-auto max-w-3xl bg-white p-10 text-slate-800">
      <PrintButton />

      <div className="flex items-start justify-between border-b-2 border-brand-600 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-700">AI CRM</h1>
          <p className="text-sm text-slate-500">Business Operating System</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold">QUOTATION</h2>
          <p className="text-sm text-slate-500">{q.number}</p>
          <p className="text-sm text-slate-500">{formatDate(q.createdAt)}</p>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-xs uppercase text-slate-400">Bill To</p>
        <p className="font-semibold">{q.customer.name}</p>
        {q.customer.company && <p className="text-sm text-slate-600">{q.customer.company}</p>}
        {q.customer.email && <p className="text-sm text-slate-600">{q.customer.email}</p>}
        {q.customer.phone && <p className="text-sm text-slate-600">{q.customer.phone}</p>}
      </div>

      <table className="mt-8 w-full text-sm">
        <thead>
          <tr className="border-b border-slate-300 text-left">
            <th className="py-2">Description</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2 text-right">Unit Price</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="py-2">{it.description}</td>
              <td className="py-2 text-right">{it.qty}</td>
              <td className="py-2 text-right">{formatCurrency(it.unitPrice)}</td>
              <td className="py-2 text-right">{formatCurrency(it.qty * it.unitPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-end">
        <div className="w-64 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatCurrency(q.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Tax ({q.taxRate}%)</span><span>{formatCurrency(q.taxAmount)}</span></div>
          <div className="flex justify-between border-t border-slate-300 pt-1 text-base font-bold"><span>Total</span><span className="text-brand-700">{formatCurrency(q.total)}</span></div>
        </div>
      </div>

      {q.notes && (
        <div className="mt-8 border-t border-slate-200 pt-4 text-sm text-slate-600">
          <p className="font-medium text-slate-700">Notes</p>
          <p className="whitespace-pre-line">{q.notes}</p>
        </div>
      )}

      <p className="mt-10 text-center text-xs text-slate-400">
        This is a computer-generated quotation. Thank you for your business.
      </p>
    </div>
  );
}
