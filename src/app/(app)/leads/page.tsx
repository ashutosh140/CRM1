import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader, EmptyState } from "@/components/ui";
import { LeadRow } from "@/components/LeadRow";
import { LeadSearch } from "@/components/LeadSearch";
import type { LeadStatus, Prisma } from "@prisma/client";

const STATUSES: (LeadStatus | "ALL")[] = [
  "ALL", "NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST",
];

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;

  const where: Prisma.LeadWhereInput = {};
  if (status && status !== "ALL") where.status = status as LeadStatus;
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
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    include: { owner: { select: { name: true } }, stage: { select: { name: true } } },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="Lead Management"
        subtitle="Auto-captured leads from WhatsApp, Email, Web & Social — scored by AI."
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

      {/* search */}
      <div className="mb-4">
        <LeadSearch />
      </div>

      {/* status filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUSES.map((s) => {
          const active = (status ?? "ALL") === s;
          const href = s === "ALL"
            ? (q ? `/leads?q=${encodeURIComponent(q)}` : "/leads")
            : `/leads?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
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
