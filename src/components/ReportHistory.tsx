"use client";

import { useState } from "react";
import { History, ChevronDown, FileText, Mail, User2 } from "lucide-react";
import { Card } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

interface Send { id: string; sentByName: string | null; sentTo: string | null; createdAt: string; }
interface Report { id: string; title: string; createdAt: string; createdByName: string | null; sends: Send[]; }

export function ReportHistory({ reports }: { reports: Report[] }) {
  const [open, setOpen] = useState(false);
  const totalSends = reports.reduce((s, r) => s + r.sends.length, 0);

  return (
    <Card>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 text-left">
        <History size={18} className="text-brand-600" />
        <h2 className="flex-1 font-semibold text-slate-900">Report History</h2>
        <span className="text-xs text-slate-400">{reports.length} report{reports.length === 1 ? "" : "s"} · {totalSends} sent</span>
        <ChevronDown size={16} className={`text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          {reports.length === 0 && <p className="text-center text-sm text-slate-400">No reports generated yet.</p>}
          {reports.map((r) => (
            <div key={r.id} className="rounded-lg border border-slate-100 p-3">
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-brand-600" />
                <p className="flex-1 text-sm font-medium text-slate-800">{r.title}</p>
                <span className="text-xs text-slate-400">{formatDateTime(r.createdAt)}</span>
              </div>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                <User2 size={11} /> Created by {r.createdByName ?? "—"}
              </p>
              {r.sends.length === 0 ? (
                <p className="mt-2 text-xs text-slate-400">Not sent yet.</p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {r.sends.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center gap-1.5 rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-700 dark:bg-emerald-900/20">
                      <Mail size={11} /> Sent to <b>{s.sentTo}</b> by {s.sentByName ?? "—"} · {formatDateTime(s.createdAt)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
