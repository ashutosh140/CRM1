import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader, EmptyState } from "@/components/ui";
import { formatCurrency, initials } from "@/lib/utils";

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    orderBy: { healthScore: "desc" },
    include: {
      owner: { select: { name: true } },
      _count: { select: { quotations: true, invoices: true } },
    },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Clients doing business with you — with AI Health Score & lifetime value."
        action={
          <Link href="/customers/new" className="btn-primary">
            <Plus size={16} /> Add Customer
          </Link>
        }
      />
      {customers.length === 0 ? (
        <EmptyState message="No customers yet. Won leads become customers, or seed the database." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {customers.map((c) => (
            <Link key={c.id} href={`/customers/${c.id}`} className="card p-5 transition hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700">
                  {initials(c.name)}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">{c.name}</p>
                  <p className="truncate text-xs text-slate-400">{c.company ?? c.email ?? "—"}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span>LTV: <b className="text-slate-700">{formatCurrency(c.lifetimeValue)}</b></span>
                <span>{c._count.quotations} quotes · {c._count.invoices} invoices</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
