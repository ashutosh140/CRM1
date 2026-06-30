"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, X } from "lucide-react";

/** Maps a spoken phrase to an action. */
const ROUTES: { keywords: string[]; path: string; label: string }[] = [
  { keywords: ["dashboard", "home"], path: "/dashboard", label: "Dashboard" },
  { keywords: ["lead capture", "capture lead", "new lead from"], path: "/leads/capture", label: "AI Lead Capture" },
  { keywords: ["new lead", "add lead", "create lead"], path: "/leads/new", label: "New Lead" },
  { keywords: ["lead", "leads"], path: "/leads", label: "Leads" },
  { keywords: ["customer", "customers", "clients"], path: "/customers", label: "Customers" },
  { keywords: ["pipeline", "deals"], path: "/pipeline", label: "Pipeline" },
  { keywords: ["follow up", "follow-up", "pending", "task", "tasks"], path: "/tasks", label: "Tasks" },
  { keywords: ["new quotation", "create quotation", "make quotation"], path: "/quotations/new", label: "New Quotation" },
  { keywords: ["quotation", "quote", "quotes"], path: "/quotations", label: "Quotations" },
  { keywords: ["invoice", "invoices", "payment"], path: "/invoices", label: "Invoices" },
  { keywords: ["meeting", "summary", "transcript"], path: "/meetings", label: "Meetings" },
  { keywords: ["report", "reports", "forecast", "prediction"], path: "/reports", label: "Reports" },
  { keywords: ["communication", "messages", "inbox"], path: "/communication", label: "Communication" },
];

export function VoiceAssistant() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const recogRef = useRef<any>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    const r = new SR();
    r.lang = "en-IN";
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e: any) => {
      const text = e.results[0][0].transcript.toLowerCase();
      setTranscript(text);
      handleCommand(text);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recogRef.current = r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCommand(text: string) {
    const match = ROUTES.find((route) => route.keywords.some((k) => text.includes(k)));
    if (match) {
      setResult(`Opening ${match.label}…`);
      setTimeout(() => { router.push(match.path); setOpen(false); setResult(null); }, 700);
    } else {
      setResult("Samajh nahi aaya. Try: \"show leads\", \"new quotation\", \"pending follow-ups\".");
    }
  }

  function toggleListen() {
    if (!recogRef.current) return;
    if (listening) { recogRef.current.stop(); setListening(false); return; }
    setTranscript(""); setResult(null);
    try { recogRef.current.start(); setListening(true); } catch { /* already started */ }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition hover:bg-brand-700"
        title="Voice Assistant"
      >
        <Mic size={22} />
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Voice Assistant</h3>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
          </div>

          {!supported ? (
            <p className="text-sm text-slate-500">Aapka browser voice recognition support nahi karta. Chrome/Edge try karo.</p>
          ) : (
            <>
              <div className="flex flex-col items-center gap-3 py-2">
                <button
                  onClick={toggleListen}
                  className={`flex h-16 w-16 items-center justify-center rounded-full transition ${listening ? "animate-pulse bg-rose-500 text-white" : "bg-brand-50 text-brand-600"}`}
                >
                  {listening ? <MicOff size={26} /> : <Mic size={26} />}
                </button>
                <p className="text-xs text-slate-400">{listening ? "Listening… bolo" : "Tap to speak"}</p>
              </div>
              {transcript && <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">"{transcript}"</p>}
              {result && <p className="mt-2 text-sm font-medium text-brand-600">{result}</p>}
              <p className="mt-3 text-[11px] text-slate-400">
                Try: "show leads", "open pipeline", "new quotation", "pending follow-ups", "reports".
              </p>
            </>
          )}
        </div>
      )}
    </>
  );
}
