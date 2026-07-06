import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canSeeAll } from "@/lib/auth";
import { Card, Badge, PageHeader } from "@/components/ui";
import { QuotationTools } from "@/components/QuotationTools";
import { formatCurrency, formatDate } from "@/lib/utils";

interface QItem { description: string; qty: number; unitPrice: number; }

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const { id } = await params;
  const q = await prisma.quotation.findUnique({
    where: { id },
    include: { customer: true, createdBy: { select: { name: true } } },
  });
  if (!q) notFound();
  // SALES/EMPLOYEE may only open quotations they created or that belong to their customer.
  if (!canSeeAll(me.role) && q.createdById !== me.id && q.customer.ownerId !== me.id) notFound();
  const items = q.items as unknown as QItem[];

  return (
    <div>
      <Link href="/quotations" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={16} /> Back to quotations
      </Link>
      <PageHeader
        title={q.number}
        subtitle={`For ${q.customer.name}`}
        action={<Badge value={q.status} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
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
              <span className="text-slate-500">Subtotal: {formatCurrency(q.subtotal)}</span>
              {q.discount > 0 && <span className="text-rose-600">Discount: − {formatCurrency(q.discount)}</span>}
              <span className="text-slate-500">Tax ({q.taxRate}%): {formatCurrency(q.taxAmount)}</span>
              <span className="text-base font-semibold text-brand-700">Total: {formatCurrency(q.total)}</span>
            </div>
            {q.notes && <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{q.notes}</p>}
            <p className="mt-3 text-xs text-slate-400">
              Created {formatDate(q.createdAt)}{q.createdBy ? ` by ${q.createdBy.name}` : ""}
              {q.validUntil ? ` · Valid until ${formatDate(q.validUntil)}` : ""}
            </p>
          </Card>
        </div>

        <QuotationTools quotationId={q.id} />
      </div>
    </div>
  );
}
