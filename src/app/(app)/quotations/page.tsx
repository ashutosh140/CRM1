import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader, EmptyState } from "@/components/ui";
import { QuotationRow } from "@/components/QuotationRow";

export default async function QuotationsPage() {
  const quotations = await prisma.quotation.findMany({
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { name: true } } },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="Quotations"
        subtitle="One-click professional quotations. Send, then convert to invoice."
        action={<Link href="/quotations/new" className="btn-primary"><Plus size={16} /> New Quotation</Link>}
      />
      {quotations.length === 0 ? (
        <EmptyState message="No quotations yet. Create one for a customer." />
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
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((q) => <QuotationRow key={q.id} q={q} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
