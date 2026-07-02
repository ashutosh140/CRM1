"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui";

interface Insight { title: string; body: string; }

export function AiAssistant({ metrics }: { metrics: Record<string, unknown> }) {
  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [mocked, setMocked] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/ai/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(metrics),
        });
        const d = await r.json();
        if (alive) { setInsights(d.insights || []); setMocked(Boolean(d.mocked)); }
      } catch {
        if (alive) setInsights([]);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <Sparkles size={18} className="text-brand-600" />
        <h2 className="font-semibold text-slate-900">AI Business Assistant</h2>
      </div>

      {insights === null ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-lg border border-slate-100 bg-slate-50/50 p-3">
              <div className="mb-2 h-3 w-1/3 rounded bg-slate-200" />
              <div className="h-2 w-full rounded bg-slate-200" />
            </div>
          ))}
          <p className="text-center text-xs text-slate-400">Generating insights…</p>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {insights.map((ins, i) => (
              <li key={i} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                <p className="text-sm font-medium text-slate-800">{ins.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{ins.body}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[10px] text-slate-400">
            {mocked ? "Heuristic insights — add OPENAI_API_KEY for live AI." : "Generated live by OpenAI."}
          </p>
        </>
      )}
    </Card>
  );
}
