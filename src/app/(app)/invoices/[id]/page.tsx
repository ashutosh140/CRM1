import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, Badge, PageHeader } from "@/components/ui";
import { InvoiceEditor } from "@/components/InvoiceEditor";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Item { description: string; qty: number; unitPrice: number; }

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: { customer: { select: { id: true, name: true, email: true } } },
  });
  if (!inv) notFound();
  const items = (inv.items as unknown as Item[]) ?? [];
  const due = inv.total - inv.paidAmount;

  return (
    <div>
      <Link href="/invoices" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={16} /> Back to invoices
      </Link>
      <PageHeader title={inv.number} subtitle={`For ${inv.customer.name}`} action={<Badge value={inv.status} />} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <div className="mb-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div><p className="text-xs text-slate-400">Customer</p><p className="text-slate-700">{inv.customer.name}</p></div>
              <div><p className="text-xs text-slate-400">Due Date</p><p className="text-slate-700">{formatDate(inv.dueDate)}</p></div>
              <div><p className="text-xs text-slate-400">Created</p><p className="text-slate-700">{formatDate(inv.createdAt)}</p></div>
              <div><p className="text-xs text-slate-400">Status</p><Badge value={inv.status} /></div>
            </div>

            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-400">
                <tr>
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 text-right font-medium">Qty</th>
                  <th className="pb-2 text-right font-medium">Unit</th>
                  <th className="pb-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="py-2 text-slate-700">{it.description}</td>
                    <td className="py-2 text-right text-slate-600">{it.qty}</td>
                    <td className="py-2 text-right text-slate-600">{formatCurrency(it.unitPrice)}</td>
                    <td className="py-2 text-right text-slate-800">{formatCurrency(it.qty * it.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 flex flex-col items-end gap-1 border-t border-slate-100 pt-4 text-sm">
              <span className="text-slate-500">Subtotal: {formatCurrency(inv.subtotal)}</span>
              <span className="text-slate-500">Tax: {formatCurrency(inv.taxAmount)}</span>
              <span className="text-base font-semibold text-slate-800">Total: {formatCurrency(inv.total)}</span>
              <span className="text-emerald-600">Paid: {formatCurrency(inv.paidAmount)}</span>
              <span className={due > 0 ? "font-medium text-rose-600" : "text-slate-500"}>Due: {formatCurrency(due)}</span>
            </div>
          </Card>
        </div>

        <InvoiceEditor inv={{
          id: inv.id, status: inv.status, total: inv.total, paidAmount: inv.paidAmount,
          dueDate: inv.dueDate?.toISOString() ?? null,
        }} />
      </div>
    </div>
  );
}
