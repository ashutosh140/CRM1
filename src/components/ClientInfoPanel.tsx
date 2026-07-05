"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useActionState } from "react";
import { FileText, LinkIcon, StickyNote, Paperclip, Trash2, Plus, Download, ChevronDown } from "lucide-react";
import { addClientInfoAction, deleteClientInfoAction } from "@/app/actions/clientinfo";
import { Card } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

interface Item {
  id: string; kind: "NOTE" | "LINK" | "FILE"; title: string | null; body: string | null;
  fileName: string | null; fileType: string | null; createdAt: string;
}

export function ClientInfoPanel({ customerId, items }: { customerId: string; items: Item[] }) {
  const [list, setList] = useState<Item[]>(items);
  const [kind, setKind] = useState<"NOTE" | "LINK" | "FILE">("NOTE");
  const [state, formAction, pending] = useActionState(addClientInfoAction, null);
  const [, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  // prepend the newly-added item and reset the form
  useEffect(() => {
    if (state?.ok && state.item) {
      setList((l) => [state.item as Item, ...l]);
      formRef.current?.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const TABS = [
    { k: "NOTE", label: "Note", icon: <StickyNote size={14} /> },
    { k: "LINK", label: "Link", icon: <LinkIcon size={14} /> },
    { k: "FILE", label: "File / Image / PDF", icon: <Paperclip size={14} /> },
  ] as const;

  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <FileText size={18} className="text-brand-600" />
        <h2 className="font-semibold text-slate-900">Client Information</h2>
      </div>
      <p className="mb-3 text-sm text-slate-500">
        Save everything about this client — notes, links, images, PDFs. The AI reads all of it when generating a report.
      </p>

      {/* Add form */}
      <form ref={formRef} action={formAction} className="space-y-3 rounded-lg border border-slate-200 p-3">
        <input type="hidden" name="customerId" value={customerId} />
        <input type="hidden" name="kind" value={kind} />
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button type="button" key={t.k} onClick={() => setKind(t.k)}
              className={`badge border ${kind === t.k ? "border-brand-300 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-600"}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <input name="title" className="input" placeholder="Title (optional)" />
        {kind === "NOTE" && (
          <textarea name="body" rows={3} className="input" placeholder="Write a note — conversation summary, key details…" />
        )}
        {kind === "LINK" && (
          <input name="body" className="input" placeholder="https://… (drive, doc, website)" />
        )}
        {kind === "FILE" && (
          <input name="file" type="file" className="input" accept="image/*,application/pdf" />
        )}
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <div className="flex justify-end">
          <button type="submit" className="btn-primary text-sm" disabled={pending}>
            <Plus size={15} /> {pending ? "Saving…" : "Add"}
          </button>
        </div>
      </form>

      {/* Saved items — collapsed by default, click to expand */}
      <div className="mt-4 space-y-1.5">
        {list.length === 0 && <p className="text-center text-sm text-slate-400">Nothing saved yet.</p>}
        {list.map((it) => (
          <InfoItem key={it.id} it={it}
            onDelete={() => start(async () => { await deleteClientInfoAction(it.id, customerId); setList((l) => l.filter((x) => x.id !== it.id)); })} />
        ))}
      </div>
    </Card>
  );
}

function InfoItem({ it, onDelete }: { it: Item; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const icon = it.kind === "NOTE" ? <StickyNote size={15} /> : it.kind === "LINK" ? <LinkIcon size={15} /> : <FileText size={15} />;
  const preview = it.title || (it.kind === "FILE" ? (it.fileName || "File") : (it.body || "").slice(0, 60)) || it.kind;

  return (
    <div className="rounded-lg border border-slate-100">
      {/* collapsed header */}
      <div className="flex items-center gap-2 p-2.5">
        <button onClick={() => setOpen((o) => !o)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span className="text-slate-400">{icon}</span>
          <span className="truncate text-sm text-slate-700">{preview}</span>
          <span className="ml-auto shrink-0 text-[10px] text-slate-400">{formatDateTime(it.createdAt)}</span>
          <ChevronDown size={15} className={`shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
        </button>
        <button onClick={onDelete} className="shrink-0 text-slate-300 hover:text-rose-500" title="Delete"><Trash2 size={14} /></button>
      </div>

      {/* expanded content */}
      {open && (
        <div className="border-t border-slate-100 p-3">
          {it.title && it.kind === "NOTE" && it.body && <p className="whitespace-pre-wrap text-sm text-slate-600">{it.body}</p>}
          {!it.title && it.kind === "NOTE" && it.body && <p className="whitespace-pre-wrap text-sm text-slate-600">{it.body}</p>}
          {it.kind === "LINK" && it.body && (
            <a href={it.body} target="_blank" rel="noreferrer" className="break-all text-sm text-brand-600 hover:underline">{it.body}</a>
          )}
          {it.kind === "FILE" && (
            it.fileType?.startsWith("image/") ? (
              <a href={`/api/client-info/${it.id}/file`} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/client-info/${it.id}/file`} alt={it.fileName || "image"} className="max-h-64 rounded-lg" />
              </a>
            ) : (
              <a href={`/api/client-info/${it.id}/file`} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-sm text-brand-600 hover:underline">
                <FileText size={14} /> {it.fileName || "file"} <Download size={13} />
              </a>
            )
          )}
        </div>
      )}
    </div>
  );
}
