"use client";

import { useEffect, useState, useTransition } from "react";
import { X, Send, Sparkles, Paperclip } from "lucide-react";
import { draftLeadEmailAction, sendLeadEmailAction } from "@/app/actions/leads";

export function EmailComposer({
  leadId, onClose,
}: {
  leadId: string; onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await draftLeadEmailAction(leadId);
      if (!alive) return;
      if (r?.ok) { setTo(r.to || ""); setSubject(r.subject || ""); setBody(r.body || ""); }
      else setResult(r?.error || "Could not draft email");
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [leadId]);

  function send() {
    setResult(null);
    start(async () => {
      const r = await sendLeadEmailAction(leadId, to, subject, body);
      if (r?.ok) {
        setResult(r.mocked ? "Queued (mock — set BREVO_API_KEY to send live)" : "Sent ✅ with strategy PDF attached");
        setTimeout(onClose, 1200);
      } else setResult(r?.error || "Send failed");
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-slate-800" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-brand-600" />
            <h3 className="font-semibold text-slate-900">Compose Email</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        {loading ? (
          <div className="space-y-3 p-6">
            <div className="h-9 animate-pulse rounded bg-slate-100" />
            <div className="h-9 animate-pulse rounded bg-slate-100" />
            <div className="h-40 animate-pulse rounded bg-slate-100" />
            <p className="text-center text-xs text-slate-400">Drafting a polite email with AI…</p>
          </div>
        ) : (
          <div className="space-y-3 p-4">
            <div>
              <label className="label">To</label>
              <input value={to} onChange={(e) => setTo(e.target.value)} className="input" placeholder="client@email.com" />
            </div>
            <div>
              <label className="label">Subject</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Message</label>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={11} className="input leading-relaxed" />
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              <Paperclip size={14} /> A comprehensive <b>Strategy &amp; Next-Steps PDF</b> is auto-generated and attached on send.
            </div>
            {result && <p className="text-sm font-medium text-emerald-600">{result}</p>}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button onClick={onClose} className="btn-ghost">Cancel</button>
              <button onClick={send} disabled={pending} className="btn-primary">
                <Send size={16} /> {pending ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
