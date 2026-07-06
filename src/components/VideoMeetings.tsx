"use client";

import { useActionState, useState, useTransition } from "react";
import { Video, Plus, ExternalLink, Copy, Trash2, Calendar, Users } from "lucide-react";
import { scheduleMeetingAction, deleteMeetingAction } from "@/app/actions/videomeetings";
import { Card } from "@/components/ui";
import { toast } from "@/lib/toast";

interface VM { id: string; title: string; link: string; scheduledAt: string | null; attendees: string | null; }

const NEW_MEET = "https://meet.google.com/new";

export function VideoMeetings({ meetings }: { meetings: VM[] }) {
  const [state, formAction, pending] = useActionState(scheduleMeetingAction, null);
  const [deleting, startDel] = useTransition();

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-3 flex items-center gap-2">
          <Video size={18} className="text-brand-600" />
          <h2 className="font-semibold text-slate-900 dark:text-white">Video Meetings (Google Meet)</h2>
        </div>

        {/* Instant meeting */}
        <a href={NEW_MEET} target="_blank" rel="noreferrer"
          className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700">
          <Video size={16} /> Start an instant Google Meet
        </a>

        {/* Schedule form */}
        <form key={state?.ok ? "done" : "form"} action={(fd) => { formAction(fd); }} className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-700">
          <p className="text-xs font-medium text-slate-500">Schedule a meeting</p>
          <input name="title" className="input" placeholder="Meeting title (e.g. Demo call with Acme)" required />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input name="scheduledAt" type="datetime-local" className="input" title="Date & time" />
            <input name="attendees" className="input" placeholder="Attendee emails (comma-separated)" />
          </div>
          <div className="flex items-center gap-2">
            <input name="link" className="input" placeholder="Paste Google Meet link (optional)" />
            <a href={NEW_MEET} target="_blank" rel="noreferrer" className="btn-ghost shrink-0 whitespace-nowrap text-xs">Get link</a>
          </div>
          <p className="text-[11px] text-slate-400">
            Tip: click “Get link”, start a Meet, copy its URL and paste it here. Leave blank to auto-open a fresh Meet on join. Attendees get an email invite.
          </p>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state?.ok && <p className="text-sm text-emerald-600">Meeting scheduled ✅{state.invited ? ` — ${state.invited} invite(s) emailed` : ""}</p>}
          <button type="submit" disabled={pending} className="btn-primary w-full">
            <Plus size={16} /> {pending ? "Scheduling…" : "Schedule meeting"}
          </button>
        </form>
      </Card>

      {/* Upcoming list */}
      <Card>
        <div className="mb-3 flex items-center gap-2">
          <Calendar size={16} className="text-brand-600" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Scheduled meetings</h3>
        </div>
        {meetings.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No scheduled meetings yet.</p>
        ) : (
          <div className="space-y-2">
            {meetings.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15">
                  <Video size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{m.title}</p>
                  <p className="flex items-center gap-2 text-xs text-slate-400">
                    {m.scheduledAt ? new Date(m.scheduledAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true }) : "Anytime"}
                    {m.attendees && <span className="flex items-center gap-0.5"><Users size={11} /> {m.attendees.split(/[,\s]+/).filter(Boolean).length}</span>}
                  </p>
                </div>
                <button onClick={() => { navigator.clipboard.writeText(m.link); toast("Link copied", "success"); }}
                  className="btn-ghost px-2" title="Copy link"><Copy size={14} /></button>
                <a href={m.link} target="_blank" rel="noreferrer" className="btn-primary px-3 text-xs"><ExternalLink size={13} /> Join</a>
                <button onClick={() => startDel(() => deleteMeetingAction(m.id).then(() => toast("Meeting removed", "info")))}
                  disabled={deleting} className="btn-ghost px-2 text-rose-500" title="Delete"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
