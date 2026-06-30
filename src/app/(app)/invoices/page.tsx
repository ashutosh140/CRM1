import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard, EmptyState } from "@/components/ui";
import { InvoiceRow } from "@/components/InvoiceRow";
import { formatCurrency } from "@/lib/utils";
import { Wallet, Clock, CheckCircle2 } from "lucide-react";

export default async function InvoicesPage() {
  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { name: true } } },
    take: 100,
  });

  const collected = invoices.reduce((s, i) => s + i.paidAmount, 0);
  const outstanding = invoices.reduce((s, i) => s + (i.total - i.paidAmount), 0);
  const overdue = invoices.filter(
    (i) => i.dueDate && i.dueDate < new Date() && i.paidAmount < i.total
  ).length;

  return (
    <div>
      <PageHeader title="Invoices & Payments" subtitle="Track billing, payments and overdue reminders." />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Collected" value={formatCurrency(collected)} icon={<CheckCircle2 size={20} />} accent="green" />
        <StatCard label="Outstanding" value={formatCurrency(outstanding)} icon={<Wallet size={20} />} accent="amber" />
        <StatCard label="Overdue Invoices" value={overdue} icon={<Clock size={20} />} accent="rose" />
      </div>

      {invoices.length === 0 ? (
        <EmptyState message="No invoices yet. Convert an accepted quotation into an invoice." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Number</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Due</th>
                  <th className="px-4 py-3 font-medium">Due Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => <InvoiceRow key={inv.id} inv={inv} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
