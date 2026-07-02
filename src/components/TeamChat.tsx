"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Send, Paperclip, Search, FileText, Download } from "lucide-react";
import {
  sendMessageAction, getConversationAction, getUnreadCountsAction,
  type ChatMessage,
} from "@/app/actions/messages";
import { initials } from "@/lib/utils";
import type { Role } from "@prisma/client";

interface Contact { id: string; name: string; email: string; role: Role; }

export function TeamChat({ meId, contacts }: { meId: string; contacts: Contact[] }) {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pending, start] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const active = contacts.find((c) => c.id === activeId) || null;
  const filtered = contacts.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));

  // load a conversation
  async function loadConversation(userId: string) {
    const res = await getConversationAction(userId);
    setMessages(res.messages);
  }

  // poll active conversation + unread counts every 3s
  useEffect(() => {
    let alive = true;
    async function tick() {
      if (activeId) { const r = await getConversationAction(activeId); if (alive) setMessages(r.messages); }
      const u = await getUnreadCountsAction(); if (alive) setUnread(u);
    }
    tick();
    const t = setInterval(tick, 3000);
    return () => { alive = false; clearInterval(t); };
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function openChat(id: string) {
    setActiveId(id);
    setMessages([]);
    loadConversation(id);
    setUnread((u) => ({ ...u, [id]: 0 }));
  }

  function handleSend() {
    if (!activeId || (!text.trim() && !file)) return;
    const fd = new FormData();
    fd.set("recipientId", activeId);
    fd.set("body", text);
    if (file) fd.set("file", file);
    const sentText = text; setText(""); const sentFile = file; setFile(null);
    if (fileRef.current) fileRef.current.value = "";
    start(async () => {
      const r = await sendMessageAction(fd);
      if (r?.error) { setText(sentText); setFile(sentFile); alert(r.error); return; }
      await loadConversation(activeId);
    });
  }

  return (
    <div className="card flex h-[calc(100vh-11rem)] overflow-hidden p-0">
      {/* Contacts list */}
      <div className="flex w-72 shrink-0 flex-col border-r border-slate-200">
        <div className="border-b border-slate-100 p-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              className="input pl-9 text-sm" placeholder="Search team…" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && <p className="p-4 text-center text-sm text-slate-400">No team members.</p>}
          {filtered.map((c) => (
            <button key={c.id} onClick={() => openChat(c.id)}
              className={`flex w-full items-center gap-3 border-b border-slate-50 p-3 text-left transition hover:bg-slate-50 ${activeId === c.id ? "bg-brand-50" : ""}`}>
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                {initials(c.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{c.name}</p>
                <p className="truncate text-xs text-slate-400">{c.role}</p>
              </div>
              {unread[c.id] > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs font-medium text-white">
                  {unread[c.id]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation */}
      <div className="flex min-w-0 flex-1 flex-col">
        {!active ? (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
            Select a team member to start chatting.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-slate-200 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                {initials(active.name)}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{active.name}</p>
                <p className="text-xs text-slate-400">{active.email} · {active.role}</p>
              </div>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50 p-4">
              {messages.length === 0 && (
                <p className="mt-8 text-center text-sm text-slate-400">No messages yet. Say hello 👋</p>
              )}
              {messages.map((m) => {
                const mine = m.senderId === meId;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-brand-600 text-white" : "bg-white text-slate-800 shadow-sm"}`}>
                      {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                      {m.hasFile && <FileAttachment id={m.id} name={m.fileName} type={m.fileType} mine={mine} />}
                      <p className={`mt-1 text-[10px] ${mine ? "text-brand-100" : "text-slate-400"}`}>
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Composer */}
            <div className="border-t border-slate-200 p-3">
              {file && (
                <div className="mb-2 flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-600">
                  <FileText size={14} /> {file.name}
                  <button onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }} className="ml-auto text-slate-400 hover:text-slate-700">✕</button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input ref={fileRef} type="file" className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <button onClick={() => fileRef.current?.click()} className="btn-ghost px-2.5" title="Attach file">
                  <Paperclip size={18} />
                </button>
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  className="input"
                  placeholder="Type a message…"
                />
                <button onClick={handleSend} disabled={pending} className="btn-primary px-3">
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FileAttachment({ id, name, type, mine }: { id: string; name: string | null; type: string | null; mine: boolean }) {
  const url = `/api/messages/${id}/file`;
  const isImage = type?.startsWith("image/");
  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="mt-1 block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={name || "image"} className="max-h-52 rounded-lg" />
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer"
      className={`mt-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${mine ? "bg-brand-500/40" : "bg-slate-100"}`}>
      <FileText size={14} /> <span className="truncate max-w-[160px]">{name || "file"}</span> <Download size={13} />
    </a>
  );
}
