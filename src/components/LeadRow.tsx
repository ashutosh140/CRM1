"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { sendLeadWelcomeEmailAction } from "@/app/actions/leads";
import { Badge, ScoreBar } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface LeadRowData {
  id: string; name: string; company: string | null; email: string | null; phone: string | null;
  source: string; ownerName: string | null; status: string; estimatedValue: number;
  score: number; createdAt: string;
}

export function LeadRow({ lead }: { lead: LeadRowData }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sent, setSent] = useState<null | "ok" | "err">(null);

  function email(e: React.MouseEvent) {
    e.stopPropagation();
    if (!lead.email) { setSent("err"); return; }
    start(async () => {
      const r = await sendLeadWelcomeEmailAction(lead.id);
      setSent(r?.ok ? "ok" : "err");
      setTimeout(() => setSent(null), 2500);
    });
  }

  return (
    <tr
      onClick={() => router.push(`/leads/${lead.id}`)}
      className="cursor-pointer border-t border-slate-100 hover:bg-slate-50/50"
    >
      <td className="px-4 py-3">
        <p className="font-medium text-slate-800">{lead.name}</p>
        <p className="text-xs text-slate-400">{lead.company ?? lead.email ?? lead.phone ?? "—"}</p>
      </td>
      <td className="px-4 py-3"><Badge value={lead.source} /></td>
      <td className="px-4 py-3 text-slate-600">{lead.ownerName ?? "Unassigned"}</td>
      <td className="px-4 py-3"><Badge value={lead.status} /></td>
      <td className="px-4 py-3 text-slate-600">{formatCurrency(lead.estimatedValue)}</td>
      <td className="px-4 py-3"><ScoreBar value={lead.score} /></td>
      <td className="px-4 py-3 text-xs text-slate-400">{formatDate(lead.createdAt)}</td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={email}
          disabled={pending}
          title={lead.email ? "Send welcome email + PDF" : "No email on file"}
          className={`btn-ghost px-2 text-xs ${sent === "ok" ? "text-emerald-600" : sent === "err" ? "text-rose-600" : ""}`}
        >
          <Mail size={14} /> {pending ? "…" : sent === "ok" ? "Sent" : sent === "err" ? "Failed" : "Email"}
        </button>
      </td>
    </tr>
  );
}
