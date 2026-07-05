import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft, Sparkles, Send, Clock,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canSeeAll } from "@/lib/auth";
import { suggestFollowup } from "@/lib/ai";
import { Card, Badge, ScoreBar, PageHeader } from "@/components/ui";
import { StatusSelect, ActivityForm, RescoreButton } from "@/components/LeadActions";
import { LeadEditor } from "@/components/LeadEditor";
import { formatDateTime, relativeDays } from "@/lib/utils";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const { id } = await params;
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      owner: { select: { name: true } },
      stage: { select: { name: true } },
      activities: { orderBy: { createdAt: "desc" }, take: 20, include: { user: { select: { name: true } } } },
    },
  });
  if (!lead) notFound();
  // SALES/EMPLOYEE may only open their own leads.
  if (!canSeeAll(me.role) && lead.ownerId !== me.id) notFound();

  const { data: followup } = await suggestFollowup({
    name: lead.name,
    status: lead.status,
    lastContactedAt: lead.lastContactedAt?.toISOString() ?? null,
    productRequirement: lead.productRequirement,
  });

  const lastDays = relativeDays(lead.lastContactedAt);

  return (
    <div>
      <Link href="/leads" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={16} /> Back to leads
      </Link>

      <PageHeader
        title={lead.name}
        subtitle={[lead.code, lead.company].filter(Boolean).join(" · ") || undefined}
        action={
          <div className="flex items-center gap-2">
            <StatusSelect leadId={lead.id} current={lead.status} />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: details + activity */}
        <div className="space-y-6 lg:col-span-2">
          <LeadEditor lead={{
            id: lead.id, name: lead.name, company: lead.company, email: lead.email, phone: lead.phone,
            altPhone: lead.altPhone, source: lead.source, status: lead.status, estimatedValue: lead.estimatedValue,
            website: lead.website, facebook: lead.facebook, instagram: lead.instagram, twitter: lead.twitter,
            otherLinks: lead.otherLinks, heroProducts: lead.heroProducts, contractMonths: lead.contractMonths,
            onboardedAt: lead.onboardedAt?.toISOString() ?? null, inquiryReason: lead.inquiryReason,
            productRequirement: lead.productRequirement,
            stageName: lead.stage?.name ?? null, ownerName: lead.owner?.name ?? null,
            customerId: lead.customerId,
          }} />

          {/* Activity / conversations */}
          <Card>
            <h2 className="mb-3 font-semibold text-slate-900">Conversation & Activity</h2>
            <ActivityForm leadId={lead.id} />
            <div className="mt-4 space-y-3">
              {lead.activities.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">No activity yet.</p>
              ) : (
                lead.activities.map((a) => (
                  <div key={a.id} className="flex gap-3 border-b border-slate-50 pb-3 last:border-0">
                    <div className="mt-0.5">
                      <Badge value={a.channel} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-700">{a.content}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span>{formatDateTime(a.createdAt)}</span>
                        {a.user && <span>· {a.user.name}</span>}
                        {a.sentiment && <Badge value={a.sentiment} />}
                        {a.intentScore != null && <span>· intent {a.intentScore}%</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right: AI panel */}
        <div className="space-y-6">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-brand-600" />
                <h2 className="font-semibold text-slate-900">AI Insights</h2>
              </div>
              <RescoreButton leadId={lead.id} />
            </div>
            <div className="space-y-3">
              <Metric label="Buying Intent" value={lead.intent} />
              <Metric label="Urgency" value={lead.urgency} />
              <Metric label="Closing Probability" value={lead.closingProbability} />
            </div>
          </Card>

          <Card>
            <div className="mb-2 flex items-center gap-2">
              <Send size={16} className="text-brand-600" />
              <h2 className="font-semibold text-slate-900">Smart Follow-up</h2>
            </div>
            {lastDays != null && (
              <p className="mb-2 flex items-center gap-1 text-xs text-slate-400">
                <Clock size={12} /> Last contact {lastDays} day{lastDays === 1 ? "" : "s"} ago
              </p>
            )}
            <div className="rounded-lg border border-brand-100 bg-brand-50/50 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs">
                <Badge value={followup.channel} />
                <span className="text-slate-500">in {followup.sendInDays} day(s)</span>
              </div>
              <p className="text-sm text-slate-700">{followup.message}</p>
            </div>
            <p className="mt-2 text-[10px] text-slate-400">
              AI picks the best channel, time & message. Wire WhatsApp/Email keys to auto-send.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-slate-600">{label}</span>
      </div>
      <ScoreBar value={value} />
    </div>
  );
}
