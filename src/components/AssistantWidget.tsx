"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send, Bot, Mic } from "lucide-react";
import { toast } from "@/lib/toast";

interface Msg { role: "user" | "ai"; text: string; }

const SUGGESTIONS = [
  "How many open leads do I have?",
  "What's my revenue and outstanding?",
  "Which are my hottest leads right now?",
  "How many overdue invoices?",
];

export function AssistantWidget({ name = "" }: { name?: string }) {
  const firstName = name.split(" ")[0] || "there";
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, loading]);

  function toggleMic() {
    if (listening) { recRef.current?.stop(); setListening(false); return; }
    const SR = (window as unknown as { SpeechRecognition?: new () => never; webkitSpeechRecognition?: new () => never })
      .SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: new () => never }).webkitSpeechRecognition;
    if (!SR) { toast("Voice input isn't supported in this browser. Try Chrome.", "error"); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new (SR as any)();
    rec.lang = "en-IN";
    rec.interimResults = true;
    rec.continuous = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join(""); // eslint-disable-line @typescript-eslint/no-explicit-any
      setText(t);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  async function ask(q: string) {
    const question = q.trim();
    if (!question || loading) return;
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setText("");
    setLoading(true);
    try {
      const r = await fetch("/api/ai/assistant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const d = await r.json();
      setMsgs((m) => [...m, { role: "ai", text: d.answer || "Sorry, I couldn't answer that." }]);
    } catch {
      setMsgs((m) => [...m, { role: "ai", text: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-[85] flex items-center gap-2 rounded-full bg-brand-600 px-4 py-3.5 text-white shadow-2xl ring-4 ring-brand-500/25 transition hover:scale-105 hover:bg-brand-700"
        title="Ask the AI Assistant"
      >
        {open ? <X size={22} /> : <Sparkles size={22} />}
        {!open && <span className="hidden text-sm font-semibold sm:inline">Ask AI</span>}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-[80] flex h-[30rem] w-[92vw] max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
          {/* header */}
          <div className="flex items-center gap-2 bg-brand-600 px-4 py-3 text-white">
            <Bot size={18} />
            <div className="flex-1">
              <p className="text-sm font-semibold leading-tight">{firstName}&apos;s AI Assistant</p>
              <p className="text-[11px] text-brand-100">Your personal CRM copilot</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-brand-100 hover:text-white"><X size={18} /></button>
          </div>

          {/* messages */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3 dark:bg-slate-900/40">
            {msgs.length === 0 && (
              <div className="space-y-2">
                <p className="text-center text-xs text-slate-400">Hi {firstName}! 👋 Ask me anything about <b>your</b> leads, revenue, tasks &amp; more.</p>
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => ask(s)}
                    className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-600 hover:border-brand-300 hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {s}
                  </button>
                ))}
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-brand-600 text-white" : "bg-white text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200"}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-white px-3 py-2 text-sm text-slate-400 shadow-sm dark:bg-slate-800">Thinking…</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* input */}
          <div className="border-t border-slate-200 p-2 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <button onClick={toggleMic} title="Speak your question"
                className={`btn-ghost px-2.5 ${listening ? "animate-pulse bg-rose-50 text-rose-600 dark:bg-rose-500/10" : ""}`}>
                <Mic size={16} />
              </button>
              <input
                value={text} onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") ask(text); }}
                placeholder={listening ? "Listening…" : "Ask or speak a question…"} className="input" disabled={loading}
              />
              <button onClick={() => ask(text)} disabled={loading || !text.trim()} className="btn-primary px-3"><Send size={16} /></button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
