"use client";

import { useState, useTransition } from "react";
import { useActionState } from "react";
import { MessageSquarePlus, RefreshCw } from "lucide-react";
import {
  updateLeadStatusAction, addActivityAction, rescoreLeadAction,
} from "@/app/actions/leads";
import { Badge } from "@/components/ui";
import type { LeadStatus } from "@prisma/client";

const STATUSES: LeadStatus[] = [
  "NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST",
];
const CHANNELS = ["NOTE", "WHATSAPP", "EMAIL", "SMS", "CALL"];

export function StatusSelect({ leadId, current }: { leadId: string; current: LeadStatus }) {
  const [pending, start] = useTransition();
  return (
    <select
      defaultValue={current}
      disabled={pending}
      onChange={(e) => start(() => updateLeadStatusAction(leadId, e.target.value as LeadStatus))}
      className="input max-w-[180px] text-sm"
    >
      {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
    </select>
  );
}

export function RescoreButton({ leadId }: { leadId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(() => rescoreLeadAction(leadId))}
      disabled={pending}
      className="btn-ghost text-xs"
    >
      <RefreshCw size={14} className={pending ? "animate-spin" : ""} /> Re-score with AI
    </button>
  );
}

export function ActivityForm({ leadId }: { leadId: string }) {
  const [state, formAction, pending] = useActionState(addActivityAction, null);
  const [content, setContent] = useState("");

  return (
    <form
      action={(fd) => { formAction(fd); setContent(""); }}
      className="space-y-3"
    >
      <input type="hidden" name="leadId" value={leadId} />
      <div className="flex gap-2">
        <select name="channel" className="input max-w-[140px] text-sm">
          {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input
          name="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="input"
          placeholder="Log a call note or paste customer reply — AI analyses sentiment & intent…"
        />
        <button type="submit" className="btn-primary" disabled={pending}>
          <MessageSquarePlus size={16} /> {pending ? "…" : "Log"}
        </button>
      </div>
      {state?.ok && state.analysis && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
          <span className="text-slate-500">AI:</span>
          <Badge value={state.analysis.sentiment} />
          <span className="text-slate-600">Intent {state.analysis.intent}%</span>
          <span className="text-slate-600">Urgency {state.analysis.urgency}%</span>
          <span className="text-slate-400">· Next: {state.analysis.nextBestAction}</span>
        </div>
      )}
    </form>
  );
}
