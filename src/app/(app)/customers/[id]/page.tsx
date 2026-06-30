import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, Building2, Heart } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, Badge, ScoreBar, PageHeader } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      owner: { select: { name: true } },
      quotations: { orderBy: { createdAt: "desc" }, take: 10 },
      invoices: { orderBy: { createdAt: "desc" }, take: 10 },
      activities: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!customer) notFound();

  const risk = customer.healthScore < 40;

  return (
    <div>
      <Link href="/customers" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={16} /> Back to customers
      </Link>
      <PageHeader title={customer.name} subtitle={customer.company ?? undefined} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Info icon={<Building2 size={15} />} label="Company" value={customer.company ?? "—"} />
              <Info icon={<Mail size={15} />} label="Email" value={customer.email ?? "—"} />
              <Info icon={<Phone size={15} />} label="Phone" value={customer.phone ?? "—"} />
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold text-slate-900">Quotations</h2>
            {customer.quotations.length === 0 ? <Empty /> : (
              <ul className="divide-y divide-slate-100 text-sm">
                {customer.quotations.map((q) => (
                  <li key={q.id} className="flex items-center justify-between py-2">
                    <span className="text-slate-700">{q.number}</span>
                    <span className="flex items-center gap-3">
                      <Badge value={q.status} />
                      <span className="text-slate-600">{formatCurrency(q.total)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold text-slate-900">Invoices</h2>
            {customer.invoices.length === 0 ? <Empty /> : (
              <ul className="divide-y divide-slate-100 text-sm">
                {customer.invoices.map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between py-2">
                    <span className="text-slate-700">{inv.number}</span>
                    <span className="flex items-center gap-3">
                      <Badge value={inv.status} />
                      <span className="text-slate-600">{formatCurrency(inv.total)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <Heart size={16} className={risk ? "text-rose-500" : "text-emerald-500"} />
              <h2 className="font-semibold text-slate-900">Customer Health</h2>
            </div>
            <ScoreBar value={customer.healthScore} />
            <p className={`mt-3 rounded-lg px-3 py-2 text-xs ${risk ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
              {risk
                ? "At-risk customer — AI recommends a recovery offer and a personal call."
                : "Healthy & engaged — good upsell candidate."}
            </p>
            <div className="mt-4 text-sm text-slate-500">
              <p>Lifetime Value: <b className="text-slate-800">{formatCurrency(customer.lifetimeValue)}</b></p>
              <p className="mt-1">Owner: {customer.owner?.name ?? "Unassigned"}</p>
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold text-slate-900">Recent Activity</h2>
            {customer.activities.length === 0 ? <Empty /> : (
              <ul className="space-y-2 text-sm">
                {customer.activities.map((a) => (
                  <li key={a.id} className="border-b border-slate-50 pb-2 last:border-0">
                    <div className="flex items-center gap-2">
                      <Badge value={a.channel} />
                      <span className="text-xs text-slate-400">{formatDate(a.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-slate-600">{a.content}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <p className="flex items-center gap-1 text-xs text-slate-400">{icon} {label}</p>
      <p className="mt-0.5 truncate text-slate-700">{value}</p>
    </div>
  );
}
function Empty() {
  return <p className="py-4 text-center text-sm text-slate-400">Nothing yet.</p>;
}
