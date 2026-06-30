"use client";

import { useState, useTransition } from "react";
import { Sparkles, IndianRupee, Mail, Printer } from "lucide-react";
import Link from "next/link";
import {
  generateProposalAction, pricingAdviceAction, emailQuotationAction,
} from "@/app/actions/quotations";
import { Card } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

export function QuotationTools({ quotationId }: { quotationId: string }) {
  const [pending, start] = useTransition();
  const [proposal, setProposal] = useState<any>(null);
  const [advice, setAdvice] = useState<any>(null);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-3 flex items-center gap-2">
          <Sparkles size={16} className="text-brand-600" />
          <h2 className="font-semibold text-slate-900">AI Tools</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost text-sm" disabled={pending}
            onClick={() => start(async () => { const r = await generateProposalAction(quotationId); if (r.ok) setProposal(r.proposal); })}>
            <Sparkles size={15} /> Generate Proposal
          </button>
          <button className="btn-ghost text-sm" disabled={pending}
            onClick={() => start(async () => { const r = await pricingAdviceAction(quotationId); if (r.ok) setAdvice(r.advice); })}>
            <IndianRupee size={15} /> Pricing Advice
          </button>
          <button className="btn-ghost text-sm" disabled={pending}
            onClick={() => start(async () => { const r = await emailQuotationAction(quotationId); setEmailMsg(r.ok ? (r.mocked ? "Email queued (mock — add BREVO_API_KEY to send live)" : "Email sent ✅") : (r.error || "Failed")); })}>
            <Mail size={15} /> Email to Customer
          </button>
          <Link href={`/print/quotation/${quotationId}`} target="_blank" className="btn-ghost text-sm">
            <Printer size={15} /> Print / PDF
          </Link>
        </div>
        {emailMsg && <p className="mt-3 text-sm text-slate-600">{emailMsg}</p>}
      </Card>

      {advice && (
        <Card>
          <h3 className="mb-2 font-semibold text-slate-900">Dynamic Pricing Recommendation</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="Max safe discount" value={`${advice.maxSafeDiscountPct}%`} />
            <Stat label="Recommended price" value={formatCurrency(advice.recommendedPrice)} />
            <Stat label="Expected profit" value={formatCurrency(advice.expectedProfit)} />
            <Stat label="Winning probability" value={`${advice.winningProbability}%`} />
          </div>
          <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{advice.rationale}</p>
        </Card>
      )}

      {proposal && (
        <Card>
          <h3 className="mb-2 font-semibold text-slate-900">AI-Generated Proposal</h3>
          <div className="space-y-3 text-sm text-slate-700">
            <Section title="Cover Letter" body={proposal.coverLetter} />
            <Section title="Executive Summary" body={proposal.executiveSummary} />
            {proposal.scope?.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-slate-400">Scope</p>
                <ul className="list-inside list-disc text-slate-600">
                  {proposal.scope.map((s: string, i: number) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            <Section title="Closing" body={proposal.closing} />
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 p-2">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-semibold text-slate-800">{value}</p>
    </div>
  );
}
function Section({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-slate-400">{title}</p>
      <p className="whitespace-pre-line text-slate-600">{body}</p>
    </div>
  );
}
