import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader, Badge, ScoreBar, EmptyState } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { LeadStatus } from "@prisma/client";

const STATUSES: (LeadStatus | "ALL")[] = [
  "ALL", "NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST",
];

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const where = status && status !== "ALL" ? { status: status as LeadStatus } : {};

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

      {/* status filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUSES.map((s) => {
          const active = (status ?? "ALL") === s;
          return (
            <Link
              key={s}
              href={s === "ALL" ? "/leads" : `/leads?status=${s}`}
              className={`badge border ${active ? "border-brand-300 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-600"}`}
            >
              {s.replace(/_/g, " ")}
            </Link>
          );
        })}
      </div>

      {leads.length === 0 ? (
        <EmptyState message="Koi lead nahi mili. 'AI Capture' se message paste karo ya 'New Lead' banao." />
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
                  <th className="px-4 py-3 font-medium">AI Score</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <Link href={`/leads/${lead.id}`} className="font-medium text-slate-800 hover:text-brand-600">
                        {lead.name}
                      </Link>
                      <p className="text-xs text-slate-400">{lead.company ?? lead.email ?? lead.phone ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3"><Badge value={lead.source} /></td>
                    <td className="px-4 py-3 text-slate-600">{lead.owner?.name ?? "Unassigned"}</td>
                    <td className="px-4 py-3"><Badge value={lead.status} /></td>
                    <td className="px-4 py-3 text-slate-600">{formatCurrency(lead.estimatedValue)}</td>
                    <td className="px-4 py-3"><ScoreBar value={lead.score} /></td>
                    <td className="px-4 py-3 text-xs text-slate-400">{formatDate(lead.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
