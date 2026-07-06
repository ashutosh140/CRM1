"use client";

import { useState, useTransition, useRef } from "react";
import { Sparkles, FileText, Download, Trash2, ChevronDown, Save, Mail, Paperclip } from "lucide-react";
import {
  generateClientReportAction, updateReportAction, deleteReportAction, sendReportEmailAction, reportPdfAction,
} from "@/app/actions/reports";
import { Card } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { toast } from "@/lib/toast";

interface Report { id: string; title: string; content: string; createdAt: string; }

const SUGGESTIONS = [
  "Full relationship summary with next steps",
  "Is this client at risk? What should we do?",
  "Upsell opportunities and recommended offer",
  "Summary of all past conversations",
];

export function ClientReportPanel({
  customerId, customerName, initialReports,
}: {
  customerId: string; customerName: string; initialReports: Report[];
}) {
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [instruction, setInstruction] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function generate() {
    start(async () => {
      const r = await generateClientReportAction(customerId, instruction);
      if (r?.error) { toast(r.error, "error"); return; }
      if (r.ok && r.report) {
        setReports((prev) => [r.report as Report, ...prev]);
        setOpenId(r.report.id);
        setInstruction("");
      }
    });
  }

  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <Sparkles size={18} className="text-brand-600" />
        <h2 className="font-semibold text-slate-900">AI Client Reports</h2>
      </div>
      <p className="mb-3 text-sm text-slate-500">
        Tell the AI what report you need for <b>{customerName}</b>. It reads all their data & conversations and writes it for you.
      </p>

      <textarea
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        rows={2}
        className="input"
        placeholder="e.g. Write a report on Suresh's buying interest and suggest next steps…"
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => setInstruction(s)}
            className="badge border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
            {s}
          </button>
        ))}
      </div>
      <div className="mt-3 flex justify-end">
        <button onClick={generate} disabled={pending} className="btn-primary">
          <Sparkles size={16} /> {pending ? "Generating…" : "Generate Report"}
        </button>
      </div>

      {/* Reports list */}
      <div className="mt-5 space-y-2">
        {reports.length === 0 && <p className="text-center text-sm text-slate-400">No reports yet.</p>}
        {reports.map((r) => (
          <ReportItem key={r.id} report={r} open={openId === r.id}
            onToggle={() => setOpenId(openId === r.id ? null : r.id)}
            onDelete={() => start(async () => { await deleteReportAction(r.id, customerId); setReports((p) => p.filter((x) => x.id !== r.id)); })}
          />
        ))}
      </div>
    </Card>
  );
}

/** Render markdown-ish report text as clean formatted elements (no #, *, /). */
function MarkdownView({ text }: { text: string }) {
  const strip = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/[*_`]/g, "");
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5 text-sm text-slate-700">
      {lines.map((raw, i) => {
        const t = raw.trim();
        if (t === "") return <div key={i} className="h-2" />;
        if (t.startsWith("### ")) return <h4 key={i} className="pt-1 text-sm font-semibold text-brand-700">{strip(t.slice(4))}</h4>;
        if (t.startsWith("## ")) return <h3 key={i} className="pt-2 text-base font-semibold text-brand-700">{strip(t.slice(3))}</h3>;
        if (t.startsWith("# ")) return <h2 key={i} className="pt-2 text-lg font-bold text-slate-900">{strip(t.slice(2))}</h2>;
        if (/^[-*]\s+/.test(t)) return <div key={i} className="flex gap-2 pl-1"><span className="text-brand-500">•</span><span>{strip(t.replace(/^[-*]\s+/, ""))}</span></div>;
        if (/^\d+[.)]\s+/.test(t)) return <div key={i} className="pl-1">{strip(t)}</div>;
        return <p key={i}>{strip(t)}</p>;
      })}
    </div>
  );
}

function ReportItem({ report, open, onToggle, onDelete }: {
  report: Report; open: boolean; onToggle: () => void; onDelete: () => void;
}) {
  const [title, setTitle] = useState(report.title);
  const [content, setContent] = useState(report.content);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [edit, setEdit] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function save() {
    start(async () => { await updateReportAction(report.id, content, title); setSaved(true); setTimeout(() => setSaved(false), 2000); });
  }
  function download() {
    start(async () => {
      const r = await reportPdfAction(title, content);
      if (!r?.base64) return;
      const bytes = Uint8Array.from(atob(r.base64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${title.replace(/[^\w\s-]/g, "").trim() || "report"}.pdf`;
      a.click(); URL.revokeObjectURL(url);
    });
  }
  function sendEmail() {
    start(async () => {
      const fd = new FormData();
      fd.set("reportId", report.id);
      fd.set("title", title);
      fd.set("content", content);
      const files = fileRef.current?.files;
      if (files) Array.from(files).forEach((f) => fd.append("files", f));
      const r = await sendReportEmailAction(fd);
      setEmailMsg(r?.ok ? (r.mocked ? "Queued (mock — set BREVO_API_KEY)" : "Emailed to client ✅ (report PDF + attachments)") : (r?.error || "Failed"));
      if (r?.ok && fileRef.current) fileRef.current.value = "";
      setTimeout(() => setEmailMsg(null), 4000);
    });
  }

  return (
    <div className="rounded-lg border border-slate-200">
      <button onClick={onToggle} className="flex w-full items-center gap-2 p-3 text-left">
        <FileText size={16} className="text-brand-600" />
        <span className="flex-1 text-sm font-medium text-slate-800">{report.title}</span>
        <span className="text-xs text-slate-400">{formatDate(report.createdAt)}</span>
        <ChevronDown size={16} className={`text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-slate-100 p-3">
          {edit ? (
            <>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="input font-medium" />
              <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={16}
                className="input font-mono text-xs leading-relaxed" />
            </>
          ) : (
            <div className="max-h-96 overflow-y-auto rounded-lg bg-slate-50 p-4">
              <MarkdownView text={content} />
            </div>
          )}
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-500">
            <Paperclip size={14} /> Attach images / files to the email (optional):
            <input ref={fileRef} type="file" multiple className="text-xs" />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {saved && <span className="text-xs text-emerald-600">Saved ✅</span>}
            {emailMsg && <span className="text-xs text-emerald-600">{emailMsg}</span>}
            <button onClick={onDelete} className="btn-ghost text-xs text-rose-600"><Trash2 size={14} /> Delete</button>
            <button onClick={() => setEdit((e) => !e)} className="btn-ghost text-xs">{edit ? "Preview" : "Edit"}</button>
            <button onClick={download} disabled={pending} className="btn-ghost text-xs"><Download size={14} /> Download PDF</button>
            <button onClick={sendEmail} disabled={pending} className="btn-ghost text-xs"><Mail size={14} /> Send to Client</button>
            <button onClick={() => { save(); setEdit(false); }} disabled={pending} className="btn-primary text-xs"><Save size={14} /> {pending ? "Saving…" : "Save"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
