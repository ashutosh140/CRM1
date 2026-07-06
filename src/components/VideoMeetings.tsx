"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Video, Plus, ExternalLink, Copy, Trash2, Users, Pencil, X, Clock, CalendarClock } from "lucide-react";
import { scheduleMeetingAction, updateMeetingAction, deleteMeetingAction } from "@/app/actions/videomeetings";
import { Card } from "@/components/ui";
import { toast } from "@/lib/toast";

interface VM { id: string; title: string; link: string; scheduledAt: string | null; attendees: string | null; }

const NEW_MEET = "https://meet.google.com/new";
const pad = (n: number) => String(n).padStart(2, "0");
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fmtWhen = (iso: string | null) => iso
  ? new Date(iso).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true })
  : "Anytime";

export function VideoMeetings({ meetings }: { meetings: VM[] }) {
  const [state, formAction, pending] = useActionState(scheduleMeetingAction, null);
  const [deleting, startDel] = useTransition();
  const [editing, setEditing] = useState<VM | null>(null);

  useEffect(() => {
    if (state?.ok) toast(`Meeting scheduled ✅${state.invited ? ` — ${state.invited} invite(s) emailed` : ""}`, "success");
    else if (state?.error) toast(state.error, "error");
  }, [state]);

  return (
    <div>
      {/* Instant meeting hero */}
      <div className="mb-4 flex flex-col items-start justify-between gap-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15"><Video size={22} /></div>
          <div>
            <p className="font-semibold">Start a video meeting now</p>
            <p className="text-sm text-emerald-50">Opens a fresh Google Meet room instantly.</p>
          </div>
        </div>
        <a href={NEW_MEET} target="_blank" rel="noreferrer"
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50">
          <Video size={16} /> Start instant Meet
        </a>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Schedule form */}
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <CalendarClock size={18} className="text-brand-600" />
            <h3 className="font-semibold text-slate-900 dark:text-white">Schedule a meeting</h3>
          </div>
          <form key={state?.ok ? "done" : "form"} action={formAction} className="space-y-3">
            <div>
              <label className="label">Meeting title</label>
              <input name="title" className="input" placeholder="e.g. Demo call with Acme Corp" required />
            </div>
            <div>
              <label className="label">Date &amp; time</label>
              <input name="scheduledAt" type="datetime-local" className="input" />
            </div>
            <div>
              <label className="label">Attendee emails <span className="text-slate-400">(comma-separated — they get an invite)</span></label>
              <input name="attendees" className="input" placeholder="riya@acme.com, sam@acme.com" />
            </div>
            <div>
              <label className="label">Google Meet link <span className="text-slate-400">(optional)</span></label>
              <div className="flex items-center gap-2">
                <input name="link" className="input" placeholder="Paste a Meet link…" />
                <a href={NEW_MEET} target="_blank" rel="noreferrer" className="btn-ghost shrink-0 text-xs">Get link</a>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Leave blank to auto-open a fresh Meet when someone joins.</p>
            </div>
            <button type="submit" disabled={pending} className="btn-primary w-full">
              <Plus size={16} /> {pending ? "Scheduling…" : "Schedule meeting"}
            </button>
          </form>
        </Card>

        {/* Scheduled list */}
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <Clock size={16} className="text-brand-600" />
            <h3 className="font-semibold text-slate-900 dark:text-white">Scheduled meetings</h3>
            <span className="text-xs text-slate-400">({meetings.length})</span>
          </div>
          {meetings.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-center">
              <Video size={28} className="mb-2 text-slate-300" />
              <p className="text-sm text-slate-400">No meetings scheduled yet.</p>
            </div>
          ) : (
            <div className="max-h-[26rem] space-y-2 overflow-y-auto">
              {meetings.map((m) => {
                const upcoming = !m.scheduledAt || new Date(m.scheduledAt).getTime() >= Date.now() - 3600000;
                const emails = (m.attendees || "").split(/[,\s]+/).filter(Boolean);
                return (
                  <div key={m.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${upcoming ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15" : "bg-slate-100 text-slate-400 dark:bg-slate-700"}`}>
                        <Video size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{m.title}</p>
                        <p className="flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
                          <span>{fmtWhen(m.scheduledAt)}</span>
                          {emails.length > 0 && <span className="flex items-center gap-0.5"><Users size={11} /> {emails.length}</span>}
                          <span className={`rounded-full px-1.5 text-[10px] ${upcoming ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20" : "bg-slate-100 text-slate-500 dark:bg-slate-700"}`}>{upcoming ? "Upcoming" : "Past"}</span>
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-end gap-1">
                      <button onClick={() => { navigator.clipboard.writeText(m.link); toast("Link copied", "success"); }} className="btn-ghost px-2 text-xs" title="Copy link"><Copy size={13} /></button>
                      <button onClick={() => setEditing(m)} className="btn-ghost px-2 text-xs" title="Edit / reschedule"><Pencil size={13} /></button>
                      <button onClick={() => startDel(() => deleteMeetingAction(m.id).then(() => toast("Meeting removed", "info")))} disabled={deleting} className="btn-ghost px-2 text-xs text-rose-500" title="Delete"><Trash2 size={13} /></button>
                      <a href={m.link} target="_blank" rel="noreferrer" className="btn-primary px-3 text-xs"><ExternalLink size={13} /> Join</a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {editing && <EditMeetingModal m={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function EditMeetingModal({ m, onClose }: { m: VM; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(updateMeetingAction, null);

  useEffect(() => {
    if (state?.ok) { toast(`Meeting updated ✅${state.invited ? ` — ${state.invited} invite(s) re-sent` : ""}`, "success"); onClose(); }
    else if (state?.error) toast(state.error, "error");
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-800" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-white">Edit meeting</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="id" value={m.id} />
          <div>
            <label className="label">Meeting title</label>
            <input name="title" defaultValue={m.title} className="input" required />
          </div>
          <div>
            <label className="label">Date &amp; time</label>
            <input name="scheduledAt" type="datetime-local" defaultValue={toLocalInput(m.scheduledAt)} className="input" />
          </div>
          <div>
            <label className="label">Attendee emails</label>
            <input name="attendees" defaultValue={m.attendees ?? ""} className="input" placeholder="comma-separated" />
          </div>
          <div>
            <label className="label">Google Meet link</label>
            <input name="link" defaultValue={m.link} className="input" />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" name="resend" /> Re-send updated invite to attendees
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={pending} className="btn-primary">{pending ? "Saving…" : "Save changes"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
