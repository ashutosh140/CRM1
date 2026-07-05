"use client";

import { useEffect, useState } from "react";
import { Brain } from "lucide-react";
import { Card } from "@/components/ui";

interface Twin {
  summary: string; bestTimeToCall: string; bestOffer: string;
  recommendedTone: string; closingProbability: number; topicsToAvoid: string[];
}

export function DigitalTwinCard({ customerId }: { customerId: string }) {
  const [twin, setTwin] = useState<Twin | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`/api/customers/${customerId}/twin`, { cache: "no-store" });
        if (r.ok && alive) setTwin(await r.json());
      } catch { /* ignore */ }
    })();
    return () => { alive = false; };
  }, [customerId]);

  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <Brain size={16} className="text-brand-600" />
        <h2 className="font-semibold text-slate-900">Digital Twin — Call Prep</h2>
      </div>
      {!twin ? (
        <div className="space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-slate-100" />
          <p className="pt-2 text-center text-xs text-slate-400">Preparing AI call-prep…</p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-600">{twin.summary}</p>
          <div className="space-y-2 text-sm">
            <Row label="Best time to call" value={twin.bestTimeToCall} />
            <Row label="Best offer" value={twin.bestOffer} />
            <Row label="Recommended tone" value={twin.recommendedTone} />
            <Row label="Closing probability" value={`${twin.closingProbability}%`} />
            {twin.topicsToAvoid.length > 0 && <Row label="Topics to avoid" value={twin.topicsToAvoid.join(", ")} />}
          </div>
        </>
      )}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-50 pb-1.5 last:border-0">
      <span className="shrink-0 text-slate-400">{label}</span>
      <span className="text-right text-slate-700">{value}</span>
    </div>
  );
}
