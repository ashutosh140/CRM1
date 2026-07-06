"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, Trash2, Pin, PinOff, FileText, Save } from "lucide-react";
import { createNoteAction, updateNoteAction, deleteNoteAction, togglePinAction } from "@/app/actions/notes";
import { Card } from "@/components/ui";
import { toast } from "@/lib/toast";

interface Note { id: string; title: string; body: string; pinned: boolean; updatedAt: string; }

export function NotesApp({ notes }: { notes: Note[] }) {
  const [activeId, setActiveId] = useState<string | null>(notes[0]?.id ?? null);
  const active = notes.find((n) => n.id === activeId) ?? null;
  const [title, setTitle] = useState(active?.title ?? "");
  const [body, setBody] = useState(active?.body ?? "");
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();

  // when the selected note changes, load its content
  useEffect(() => {
    setTitle(active?.title ?? "");
    setBody(active?.body ?? "");
    setDirty(false);
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  function newNote() {
    start(async () => {
      const r = await createNoteAction();
      if (r?.id) { setActiveId(r.id); toast("New note created", "success"); }
    });
  }
  function save() {
    if (!activeId) return;
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
  function pin(id: string) { start(() => togglePinAction(id).then(() => {})); }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* List */}
      <Card className="lg:col-span-1">
        <button onClick={newNote} disabled={pending} className="btn-primary mb-3 w-full">
          <Plus size={16} /> New Note
        </button>
        <div className="space-y-1">
          {notes.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No notes yet. Create one!</p>}
          {notes.map((n) => (
            <button key={n.id} onClick={() => setActiveId(n.id)}
              className={`flex w-full items-start gap-2 rounded-lg border p-2.5 text-left transition ${activeId === n.id ? "border-brand-300 bg-brand-50 dark:bg-brand-500/10" : "border-slate-100 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/40"}`}>
              <FileText size={15} className="mt-0.5 shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                  {n.pinned && <Pin size={11} className="shrink-0 text-amber-500" />}{n.title || "Untitled"}
                </p>
                <p className="truncate text-xs text-slate-400">{n.body.slice(0, 40) || "Empty note"}</p>
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
              <input
                value={title}
                onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
                onBlur={save}
                className="flex-1 bg-transparent text-lg font-semibold text-slate-900 outline-none dark:text-white"
                placeholder="Note title"
              />
              <button onClick={() => pin(active.id)} className="btn-ghost px-2" title={active.pinned ? "Unpin" : "Pin"}>
                {active.pinned ? <PinOff size={15} /> : <Pin size={15} />}
              </button>
              <button onClick={() => del(active.id)} className="btn-ghost px-2 text-rose-500" title="Delete"><Trash2 size={15} /></button>
            </div>
            <textarea
              value={body}
              onChange={(e) => { setBody(e.target.value); setDirty(true); }}
              onBlur={save}
              rows={16}
              className="w-full flex-1 resize-none rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-sm text-slate-700 outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200"
              placeholder="Start typing… (auto-saves when you click away)"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {dirty ? "Unsaved changes…" : `Saved · ${new Date(active.updatedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true })}`}
              </span>
              <button onClick={save} disabled={pending || !dirty} className="btn-primary text-xs">
                <Save size={14} /> {pending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
