import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, Building2, Brain } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { digitalTwin } from "@/lib/ai";
import { Card, Badge, PageHeader } from "@/components/ui";
import { ClientReportPanel } from "@/components/ClientReportPanel";
import { ClientInfoPanel } from "@/components/ClientInfoPanel";
import { ReportHistory } from "@/components/ReportHistory";
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
      reports: {
        orderBy: { createdAt: "desc" }, take: 50,
        include: {
          createdBy: { select: { name: true } },
          sends: { orderBy: { createdAt: "desc" }, include: { sentBy: { select: { name: true } } } },
        },
      },
      clientInfo: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
  if (!customer) notFound();


  const { data: twin } = await digitalTwin({
    name: customer.name,
    company: customer.company,
    healthScore: customer.healthScore,
    lifetimeValue: customer.lifetimeValue,
    recentActivity: customer.activities.map((a) => a.content).slice(0, 5),
  });

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
              {customer.altPhone && <Info icon={<Phone size={15} />} label="Alt. Mobile" value={customer.altPhone} />}
              {customer.address && <Info icon={<Building2 size={15} />} label="Address" value={customer.address} />}
              {customer.contractMonths && <Info label="Contract" value={`${customer.contractMonths} months`} />}
            </div>
            {(customer.website || customer.facebook || customer.instagram || customer.twitter || customer.otherLinks) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {customer.website && <LinkChip href={customer.website} label="Website" />}
                {customer.facebook && <LinkChip href={customer.facebook} label="Facebook" />}
                {customer.instagram && <LinkChip href={customer.instagram} label="Instagram" />}
                {customer.twitter && <LinkChip href={customer.twitter} label="Twitter" />}
                {customer.otherLinks && <span className="badge bg-slate-100 text-slate-600">{customer.otherLinks}</span>}
              </div>
            )}
            {customer.heroProducts && <Block label="Hero Products" text={customer.heroProducts} />}
            {customer.inquiryReason && <Block label="Reason for Inquiry" text={customer.inquiryReason} />}
            {customer.requirement && <Block label="Nature of Work / Requirement" text={customer.requirement} />}
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
            <h2 className="mb-3 font-semibold text-slate-900">Account Summary</h2>
            <div className="text-sm text-slate-500">
              <p>Lifetime Value: <b className="text-slate-800">{formatCurrency(customer.lifetimeValue)}</b></p>
              <p className="mt-1">Owner: {customer.owner?.name ?? "Unassigned"}</p>
              {customer.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {customer.tags.map((t) => <span key={t} className="badge bg-slate-100 text-slate-600">{t}</span>)}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <Brain size={16} className="text-brand-600" />
              <h2 className="font-semibold text-slate-900">Digital Twin — Call Prep</h2>
            </div>
            <p className="mb-3 text-sm text-slate-600">{twin.summary}</p>
            <div className="space-y-2 text-sm">
              <TwinRow label="Best time to call" value={twin.bestTimeToCall} />
              <TwinRow label="Best offer" value={twin.bestOffer} />
              <TwinRow label="Recommended tone" value={twin.recommendedTone} />
              <TwinRow label="Closing probability" value={`${twin.closingProbability}%`} />
              {twin.topicsToAvoid.length > 0 && (
                <TwinRow label="Topics to avoid" value={twin.topicsToAvoid.join(", ")} />
              )}
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

      <div className="mt-6">
        <ReportHistory reports={customer.reports.map((r) => ({
          id: r.id, title: r.title, createdAt: r.createdAt.toISOString(),
          createdByName: r.createdBy?.name ?? null,
          sends: r.sends.map((s) => ({
            id: s.id, sentByName: s.sentBy?.name ?? null, sentTo: s.sentTo, createdAt: s.createdAt.toISOString(),
          })),
        }))} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ClientInfoPanel
          customerId={customer.id}
          items={customer.clientInfo.map((k) => ({
            id: k.id, kind: k.kind, title: k.title, body: k.body,
            fileName: k.fileName, fileType: k.fileType, createdAt: k.createdAt.toISOString(),
          }))}
        />
        <ClientReportPanel
          customerId={customer.id}
          customerName={customer.name}
          initialReports={customer.reports.map((r) => ({
            id: r.id, title: r.title, content: r.content, createdAt: r.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}

function Info({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
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
function Block({ label, text }: { label: string; text: string }) {
  return (
    <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
      <p className="mb-1 text-xs font-medium text-slate-400">{label}</p>
      {text}
    </div>
  );
}
function LinkChip({ href, label }: { href: string; label: string }) {
  const url = href.startsWith("http") ? href : `https://${href}`;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="badge border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100">
      {label}
    </a>
  );
}
function TwinRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-50 pb-1.5 last:border-0">
      <span className="shrink-0 text-slate-400">{label}</span>
      <span className="text-right text-slate-700">{value}</span>
    </div>
  );
}
