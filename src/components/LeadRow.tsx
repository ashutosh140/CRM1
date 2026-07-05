"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { Badge } from "@/components/ui";
import { EmailComposer } from "@/components/EmailComposer";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface LeadRowData {
  id: string; code: string | null; name: string; company: string | null; email: string | null; phone: string | null;
  source: string; ownerName: string | null; status: string; estimatedValue: number;
  score: number; createdAt: string;
}

export function LeadRow({ lead }: { lead: LeadRowData }) {
  const router = useRouter();
  const [composing, setComposing] = useState(false);

  function email(e: React.MouseEvent) {
    e.stopPropagation();
    setComposing(true);
  }

  return (
    <tr
      onClick={() => router.push(`/leads/${lead.id}`)}
      className="cursor-pointer border-t border-slate-100 hover:bg-slate-50/50"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <p className="font-medium text-slate-800">{lead.name}</p>
          {lead.code && <span className="badge bg-slate-100 font-mono text-[10px] text-slate-500">{lead.code}</span>}
        </div>
        <p className="text-xs text-slate-400">{lead.company ?? lead.email ?? lead.phone ?? "—"}</p>
      </td>
      <td className="px-4 py-3"><Badge value={lead.source} /></td>
      <td className="px-4 py-3 text-slate-600">{lead.ownerName ?? "Unassigned"}</td>
      <td className="px-4 py-3"><Badge value={lead.status} /></td>
      <td className="px-4 py-3 text-slate-600">{formatCurrency(lead.estimatedValue)}</td>
      <td className="px-4 py-3 text-xs text-slate-400">{formatDate(lead.createdAt)}</td>
      <td className="px-4 py-3 text-right">
        <button onClick={email} title="Compose email" className="btn-ghost px-2 text-xs">
          <Mail size={14} /> Email
        </button>
        {composing && <EmailComposer leadId={lead.id} onClose={() => setComposing(false)} />}
      </td>
    </tr>
  );
}
