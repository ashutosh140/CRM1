"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Send, Paperclip, Search, FileText, Download, Users, Plus, X } from "lucide-react";
import { sendMessageAction, createGroupAction } from "@/app/actions/messages";
import { initials } from "@/lib/utils";
import type { Role } from "@prisma/client";

interface Contact { id: string; name: string; email: string; role: Role; unread: number; }
interface Group { id: string; name: string; members: number; }
interface Msg {
  id: string; senderId: string; senderName: string; body: string | null;
  fileName: string | null; fileType: string | null; hasFile: boolean; createdAt: string;
}
type Target = { type: "user" | "group"; id: string; name: string; sub: string };

export function TeamChat({
  meId, initialContacts = [], initialGroups = [],
}: {
  meId: string; meRole?: Role;
  initialContacts?: Contact[]; initialGroups?: Group[];
}) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<Target | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pending, start] = useTransition();
  const [showGroup, setShowGroup] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refreshSidebar = useCallback(async () => {
    try {
      const r = await fetch("/api/chat/sidebar", { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      setContacts(d.contacts || []);
      setGroups(d.groups || []);
    } catch { /* ignore transient */ }
  }, []);

  const loadMessages = useCallback(async (t: Target) => {
    try {
      const r = await fetch(`/api/chat/messages?target=${t.type}:${t.id}`, { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      setMessages(d.messages || []);
    } catch { /* ignore */ }
  }, []);

  // poll sidebar every 4s
  useEffect(() => {
    refreshSidebar();
    const i = setInterval(refreshSidebar, 4000);
    return () => clearInterval(i);
  }, [refreshSidebar]);

  // poll active conversation every 2s + refetch instantly when tab regains focus
  useEffect(() => {
    if (!target) return;
    loadMessages(target);
    const i = setInterval(() => loadMessages(target), 2000);
    const onFocus = () => { if (!document.hidden) { loadMessages(target); refreshSidebar(); } };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearInterval(i);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [target, loadMessages, refreshSidebar]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const MAX_MB = 10;
  function handleSend() {
    if (!target || (!text.trim() && !file)) return;
    if (file && file.size > MAX_MB * 1024 * 1024) {
      alert(`File is too large. The maximum allowed size is ${MAX_MB} MB.`);
      return;
    }
    const fd = new FormData();
    fd.set("targetType", target.type);
    fd.set("targetId", target.id);
    fd.set("body", text);
    if (file) fd.set("file", file);
    const st = text, sf = file;
    setText(""); setFile(null);
    if (fileRef.current) fileRef.current.value = "";
    start(async () => {
      const r = await sendMessageAction(fd);
      if (r?.error) { setText(st); setFile(sf); alert(r.error); return; }
      loadMessages(target);
    });
  }

  const filteredContacts = contacts.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
  const filteredGroups = groups.filter((g) => g.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="card flex h-[calc(100vh-11rem)] overflow-hidden p-0">
      {/* Sidebar */}
      <div className="flex w-72 shrink-0 flex-col border-r border-slate-200">
        <div className="space-y-2 border-b border-slate-100 p-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} className="input pl-9 text-sm" placeholder="Search…" />
          </div>
          <button onClick={() => setShowGroup(true)} className="btn-ghost w-full text-sm">
            <Plus size={15} /> New Group
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredGroups.length > 0 && (
            <p className="px-3 pt-3 text-[10px] font-semibold uppercase text-slate-400">Groups</p>
          )}
          {filteredGroups.map((g) => (
            <button key={g.id} onClick={() => { setTarget({ type: "group", id: g.id, name: g.name, sub: `${g.members} members` }); setMessages([]); }}
              className={`flex w-full items-center gap-3 border-b border-slate-50 p-3 text-left hover:bg-slate-50 ${target?.type === "group" && target.id === g.id ? "bg-brand-50" : ""}`}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Users size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{g.name}</p>
                <p className="truncate text-xs text-slate-400">{g.members} members</p>
              </div>
            </button>
          ))}

          <p className="px-3 pt-3 text-[10px] font-semibold uppercase text-slate-400">Team</p>
          {filteredContacts.length === 0 && <p className="p-4 text-center text-sm text-slate-400">No team members.</p>}
          {filteredContacts.map((c) => (
            <button key={c.id} onClick={() => { setTarget({ type: "user", id: c.id, name: c.name, sub: `${c.email} · ${c.role}` }); setMessages([]); }}
              className={`flex w-full items-center gap-3 border-b border-slate-50 p-3 text-left hover:bg-slate-50 ${target?.type === "user" && target.id === c.id ? "bg-brand-50" : ""}`}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                {initials(c.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{c.name}</p>
                <p className="truncate text-xs text-slate-400">{c.role}</p>
              </div>
              {c.unread > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs font-medium text-white">{c.unread}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation */}
      <div className="flex min-w-0 flex-1 flex-col">
        {!target ? (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-400">Select a chat to start messaging.</div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-slate-200 p-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${target.type === "group" ? "bg-emerald-100 text-emerald-700" : "bg-brand-100 text-brand-700"}`}>
                {target.type === "group" ? <Users size={16} /> : initials(target.name)}
              </div>
              <div><p className="text-sm font-semibold text-slate-800">{target.name}</p><p className="text-xs text-slate-400">{target.sub}</p></div>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50 p-4">
              {messages.length === 0 && <p className="mt-8 text-center text-sm text-slate-400">No messages yet. Say hello 👋</p>}
              {messages.map((m) => {
                const mine = m.senderId === meId;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-brand-600 text-white" : "bg-white text-slate-800 shadow-sm"}`}>
                      {target.type === "group" && !mine && <p className="mb-0.5 text-[11px] font-semibold text-brand-600">{m.senderName}</p>}
                      {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                      {m.hasFile && <FileAttachment id={m.id} name={m.fileName} type={m.fileType} mine={mine} />}
                      <p className={`mt-1 text-[10px] ${mine ? "text-brand-100" : "text-slate-400"}`}>
                        {new Date(m.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-slate-200 p-3">
              {file && (
                <div className="mb-2 flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-600">
                  <FileText size={14} /> {file.name}
                  <button onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }} className="ml-auto text-slate-400 hover:text-slate-700">✕</button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input ref={fileRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <button onClick={() => fileRef.current?.click()} className="btn-ghost px-2.5" title="Attach file"><Paperclip size={18} /></button>
                <input value={text} onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  className="input" placeholder="Type a message…" />
                <button onClick={handleSend} disabled={pending} className="btn-primary px-3"><Send size={18} /></button>
              </div>
            </div>
          </>
        )}
      </div>

      {showGroup && (
        <NewGroupModal contacts={contacts} onClose={() => setShowGroup(false)}
          onCreated={async (id, name) => { setShowGroup(false); await refreshSidebar(); setTarget({ type: "group", id, name, sub: "group" }); setMessages([]); }} />
      )}
    </div>
  );
}

function NewGroupModal({ contacts, onClose, onCreated }: {
  contacts: Contact[]; onClose: () => void; onCreated: (id: string, name: string) => void;
}) {
  const [name, setName] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function toggle(id: string) {
    setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function create() {
    const fd = new FormData();
    fd.set("name", name);
    sel.forEach((id) => fd.append("memberIds", id));
    start(async () => {
      const r = await createGroupAction(fd);
      if (r?.error) { setErr(r.error); return; }
      if (r.ok && r.groupId) onCreated(r.groupId, name);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">New Group</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <input value={name} onChange={(e) => setName(e.target.value)} className="input mb-3" placeholder="Group name (e.g. Sales Team)" />
        <p className="mb-2 text-xs font-medium text-slate-500">Add members</p>
        <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
          {contacts.map((c) => (
            <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded p-1.5 hover:bg-slate-50">
              <input type="checkbox" checked={sel.has(c.id)} onChange={() => toggle(c.id)} />
              <span className="text-sm text-slate-700">{c.name}</span>
              <span className="text-xs text-slate-400">{c.role}</span>
            </label>
          ))}
        </div>
        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={create} disabled={pending} className="btn-primary">{pending ? "Creating…" : "Create Group"}</button>
        </div>
      </div>
    </div>
  );
}

function FileAttachment({ id, name, type, mine }: { id: string; name: string | null; type: string | null; mine: boolean }) {
  const url = `/api/messages/${id}/file`;
  if (type?.startsWith("image/")) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="mt-1 block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={name || "image"} className="max-h-52 rounded-lg" />
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className={`mt-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${mine ? "bg-brand-500/40" : "bg-slate-100"}`}>
      <FileText size={14} /> <span className="max-w-[160px] truncate">{name || "file"}</span> <Download size={13} />
    </a>
  );
}
