"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { captureLeadAction } from "@/app/actions/leads";
import { PageHeader, Card } from "@/components/ui";

const SOURCES = ["WHATSAPP", "EMAIL", "WEBSITE", "FACEBOOK", "INSTAGRAM"];

const SAMPLE = `Hi, this is Priya from Zenith Interiors. We saw your modular kitchen range and need around 12 units for a project in Pune. Budget is roughly 8 lakh. Please call me on +91 98200 11223 or email priya@zenithinteriors.in. Need it urgently within this month.`;

export default function CaptureLeadPage() {
  const [state, formAction, pending] = useActionState(captureLeadAction, null);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/leads" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={16} /> Back to leads
      </Link>
      <PageHeader
        title="AI Lead Capture"
        subtitle="Paste any WhatsApp / Email / DM message. AI extracts name, company, phone, email, requirement — and auto-assigns."
      />

      <Card>
        <form action={formAction} className="space-y-4">
          <div>
            <label className="label">Source</label>
            <select name="source" className="input max-w-xs">
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Raw message</label>
            <textarea
              name="message"
              rows={7}
              className="input font-mono text-sm"
              placeholder={SAMPLE}
              defaultValue={SAMPLE}
            />
          </div>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">Zero manual data entry — AI does the rest.</p>
            <button type="submit" className="btn-primary" disabled={pending}>
              <Sparkles size={16} /> {pending ? "Extracting…" : "Capture with AI"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
