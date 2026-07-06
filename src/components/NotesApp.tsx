"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  Plus, Trash2, Pin, PinOff, FileText, Save, Search,
  Bold, Italic, Underline, List, ListOrdered, Heading, Highlighter, CheckSquare,
} from "lucide-react";
import { createNoteAction, updateNoteAction, deleteNoteAction, togglePinAction, setNoteColorAction } from "@/app/actions/notes";
import { Card } from "@/components/ui";
import { toast } from "@/lib/toast";

interface Note { id: string; title: string; body: string; pinned: boolean; color: string | null; updatedAt: string; }

const COLORS: Record<string, string> = {
  slate: "bg-slate-400", indigo: "bg-brand-500", emerald: "bg-emerald-500",
  amber: "bg-amber-500", rose: "bg-rose-500", sky: "bg-sky-500", violet: "bg-violet-500",
};

export function NotesApp({ notes }: { notes: Note[] }) {
  const [q, setQ] = useState("");
  const [activeId, setActiveId] = useState<string | null>(notes[0]?.id ?? null);
  const active = notes.find((n) => n.id === activeId) ?? null;
  const [title, setTitle] = useState(active?.title ?? "");
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const editorRef = useRef<HTMLDivElement>(null);

  // load selected note into editor
  useEffect(() => {
    setTitle(active?.title ?? "");
    if (editorRef.current) editorRef.current.innerHTML = active?.body ?? "";
    setDirty(false);
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = notes.filter((n) =>
    !q.trim() || n.title.toLowerCase().includes(q.toLowerCase()) || n.body.toLowerCase().includes(q.toLowerCase())
  );

  function newNote() {
    start(async () => {
      const r = await createNoteAction();
      if (r?.id) { setActiveId(r.id); toast("New note created", "success"); }
    });
  }
  function save() {
    if (!activeId) return;
    const body = editorRef.current?.innerHTML ?? "";
    start(async () => {
      await updateNoteAction(activeId, title, body);
      setDirty(false);
      toast("Saved ✅", "success");
    });
  }
  function del(id: string) {
    if (!confirm("Delete this note?")) return;
    start(async () => {
      await deleteNoteAction(id);
      if (activeId === id) setActiveId(notes.find((n) => n.id !== id)?.id ?? null);
      toast("Note deleted", "info");
    });
  }
  const pin = (id: string) => start(() => togglePinAction(id).then(() => {}));
  const setColor = (c: string) => { if (activeId) start(() => setNoteColorAction(activeId, c).then(() => {})); };

  // rich-text command on the contentEditable
  const cmd = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    setDirty(true);
  };
  const insertChecklist = () => { cmd("insertHTML", '<div>☐ </div>'); };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* List */}
      <Card className="lg:col-span-1">
        <button onClick={newNote} disabled={pending} className="btn-primary mb-3 w-full">
          <Plus size={16} /> New Note
        </button>
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} className="input pl-9 text-sm" placeholder="Search notes…" />
        </div>
        <div className="space-y-1">
          {filtered.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No notes found.</p>}
          {filtered.map((n) => (
            <button key={n.id} onClick={() => setActiveId(n.id)}
              className={`flex w-full items-start gap-2 rounded-lg border border-l-4 p-2.5 text-left transition ${activeId === n.id ? "border-brand-300 bg-brand-50 dark:bg-brand-500/10" : "border-slate-100 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/40"}`}
              style={{ borderLeftColor: n.color ? undefined : undefined }}>
              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${COLORS[n.color || "slate"]}`} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                  {n.pinned && <Pin size={11} className="shrink-0 text-amber-500" />}{n.title || "Untitled"}
                </p>
                <p className="truncate text-xs text-slate-400">{n.body.replace(/<[^>]+>/g, " ").slice(0, 40) || "Empty note"}</p>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Editor */}
      <Card className="lg:col-span-2">
        {!active ? (
          <div className="flex h-72 items-center justify-center text-sm text-slate-400">Select a note, or create a new one.</div>
        ) : (
          <div className="flex h-full flex-col">
            <div className="mb-2 flex items-center gap-2">
              <input value={title} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} onBlur={save}
                className="flex-1 bg-transparent text-lg font-semibold text-slate-900 outline-none dark:text-white" placeholder="Note title" />
              <button onClick={() => pin(active.id)} className="btn-ghost px-2" title={active.pinned ? "Unpin" : "Pin"}>
                {active.pinned ? <PinOff size={15} /> : <Pin size={15} />}
              </button>
              <button onClick={() => del(active.id)} className="btn-ghost px-2 text-rose-500" title="Delete"><Trash2 size={15} /></button>
            </div>

            {/* formatting toolbar */}
            <div className="mb-2 flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 p-1 dark:border-slate-700">
              <TB onClick={() => cmd("bold")} title="Bold"><Bold size={15} /></TB>
              <TB onClick={() => cmd("italic")} title="Italic"><Italic size={15} /></TB>
              <TB onClick={() => cmd("underline")} title="Underline"><Underline size={15} /></TB>
              <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" />
              <TB onClick={() => cmd("formatBlock", "H2")} title="Heading"><Heading size={15} /></TB>
              <TB onClick={() => cmd("insertUnorderedList")} title="Bullet list"><List size={15} /></TB>
              <TB onClick={() => cmd("insertOrderedList")} title="Numbered list"><ListOrdered size={15} /></TB>
              <TB onClick={insertChecklist} title="Checklist"><CheckSquare size={15} /></TB>
              <TB onClick={() => cmd("hiliteColor", "#fef08a")} title="Highlight"><Highlighter size={15} /></TB>
              <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" />
              <div className="flex items-center gap-1">
                {Object.keys(COLORS).map((c) => (
                  <button key={c} type="button" onClick={() => setColor(c)}
                    className={`h-4 w-4 rounded-full ${COLORS[c]} ${active.color === c ? "ring-2 ring-offset-1 ring-slate-400" : ""}`} title={`Label ${c}`} />
                ))}
              </div>
            </div>

            <div
              ref={editorRef} contentEditable suppressContentEditableWarning
              onInput={() => setDirty(true)} onBlur={save}
              className="prose-sm min-h-[16rem] flex-1 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-sm text-slate-700 outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200 [&_h2]:mb-1 [&_h2]:mt-2 [&_h2]:text-base [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {dirty ? "Unsaved changes…" : `Saved · ${new Date(active.updatedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true })}`}
              </span>
              <button onClick={save} disabled={pending || !dirty} className="btn-primary text-xs"><Save size={14} /> {pending ? "Saving…" : "Save"}</button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function TB({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button type="button" onMouseDown={(e) => { e.preventDefault(); onClick(); }} title={title}
      className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-700">
      {children}
    </button>
  );
}
