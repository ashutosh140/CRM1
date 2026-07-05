import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { leadScope } from "@/lib/scope";
import { PageHeader, EmptyState } from "@/components/ui";
import { LeadRow } from "@/components/LeadRow";
import { LeadSearch } from "@/components/LeadSearch";
import { LeadDateFilter } from "@/components/LeadDateFilter";
import type { LeadStatus, Prisma } from "@prisma/client";

const STATUSES: (LeadStatus | "ALL")[] = [
  "ALL", "NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST",
];

// India (IST) calendar-day boundaries as UTC instants
const IST = 330 * 60000;
const dayStartUTC = (ymd: string) => new Date(Date.parse(ymd + "T00:00:00Z") - IST);

function computeDateRange(date?: string, from?: string, to?: string): Prisma.DateTimeFilter | undefined {
  const istNow = new Date(Date.now() + IST);
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  const todayYmd = ymd(istNow);
  const yestYmd = ymd(new Date(istNow.getTime() - 86400000));

  if (from || to) {
    const f: Prisma.DateTimeFilter = {};
    if (from) f.gte = dayStartUTC(from);
    if (to) f.lt = new Date(dayStartUTC(to).getTime() + 86400000);
    return f;
  }
  switch (date) {
    case "today": return { gte: dayStartUTC(todayYmd) };
    case "yesterday": return { gte: dayStartUTC(yestYmd), lt: dayStartUTC(todayYmd) };
    case "7d": return { gte: new Date(Date.now() - 7 * 86400000) };
    case "30d": return { gte: new Date(Date.now() - 30 * 86400000) };
    default: return undefined;
  }
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; date?: string; from?: string; to?: string }>;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const { status, q, date, from, to } = await searchParams;

  const where: Prisma.LeadWhereInput = { ...leadScope(me) };
  if (status && status !== "ALL") where.status = status as LeadStatus;
  const range = computeDateRange(date, from, to);
  if (range) where.createdAt = range;
  if (q && q.trim()) {
    const term = q.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { company: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { phone: { contains: term, mode: "insensitive" } },
      { code: { contains: term, mode: "insensitive" } },
    ];
  }

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { owner: { select: { name: true } }, stage: { select: { name: true } } },
    take: 200,
  });

  return (
    <div>
      <PageHeader
        title="Lead Management"
        action={
          <div className="flex gap-2">
            <Link href="/leads/capture" className="btn-ghost">
              <Sparkles size={16} /> AI Capture
            </Link>
            <Link href="/leads/new" className="btn-primary">
              <Plus size={16} /> New Lead
            </Link>
          </div>
        }
      />

      {/* search + date filter */}
      <div className="mb-4 space-y-3">
        <LeadSearch />
        <LeadDateFilter />
        <p className="text-xs text-slate-400">
          Showing <b className="text-slate-600">{leads.length}</b> lead{leads.length === 1 ? "" : "s"}
          {date || from || to ? " for the selected period" : ""}.
        </p>
      </div>

      {/* status filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUSES.map((s) => {
          const active = (status ?? "ALL") === s;
          const sp = new URLSearchParams();
          if (s !== "ALL") sp.set("status", s);
          if (q) sp.set("q", q);
          if (date) sp.set("date", date);
          if (from) sp.set("from", from);
          if (to) sp.set("to", to);
          const href = sp.toString() ? `/leads?${sp.toString()}` : "/leads";
          return (
            <Link
              key={s}
              href={href}
              className={`badge border ${active ? "border-brand-300 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-600"}`}
            >
              {s.replace(/_/g, " ")}
            </Link>
          );
        })}
      </div>

      {leads.length === 0 ? (
        <EmptyState message="No leads found. Use 'AI Capture' to paste a message, or create a 'New Lead'." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Lead</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Value</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 text-right font-medium">Email</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <LeadRow key={lead.id} lead={{
                    id: lead.id, code: lead.code, name: lead.name, company: lead.company, email: lead.email, phone: lead.phone,
                    source: lead.source, ownerName: lead.owner?.name ?? null, status: lead.status,
                    estimatedValue: lead.estimatedValue, score: lead.score, createdAt: lead.createdAt.toISOString(),
                  }} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
