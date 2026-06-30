"use client";

import { useActionState } from "react";
import { Sparkles, CheckSquare } from "lucide-react";
import { createMeetingAction } from "@/app/actions/meetings";
import { Card } from "@/components/ui";

export function MeetingForm() {
  const [state, formAction, pending] = useActionState(createMeetingAction, null);

  return (
    <Card>
      <form action={formAction} className="space-y-3">
        <input name="title" className="input" placeholder="Meeting title (e.g. Demo call — Acme Corp)" />
        <textarea
          name="transcript"
          rows={8}
          className="input font-mono text-sm"
          placeholder="Paste meeting transcript or rough notes here… (Zoom/Meet transcript, or your bullet points). AI will generate a summary, action items, and auto-create tasks."
          required
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">Audio upload + speech-to-text coming in a later phase.</p>
          <button type="submit" className="btn-primary" disabled={pending}>
            <Sparkles size={16} /> {pending ? "Summarising…" : "Generate Summary"}
          </button>
        </div>
      </form>

      {state?.ok && (
        <div className="mt-4 space-y-3 rounded-lg border border-emerald-100 bg-emerald-50/50 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
            <CheckSquare size={16} /> Summary generated · {state.taskCount} task(s) auto-created
          </div>
          <p className="text-sm text-slate-700">{state.summary}</p>
          {state.actionItems && state.actionItems.length > 0 && (
            <ul className="list-inside list-disc text-sm text-slate-600">
              {state.actionItems.map((a: string, i: number) => <li key={i}>{a}</li>)}
            </ul>
          )}
        </div>
      )}
      {state?.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
    </Card>
  );
}
