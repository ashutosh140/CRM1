"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { subscribeToasts, type ToastItem } from "@/lib/toast";

const STYLE: Record<ToastItem["type"], { icon: React.ReactNode; ring: string }> = {
  success: { icon: <CheckCircle2 size={18} className="text-emerald-500" />, ring: "ring-emerald-500/20" },
  error: { icon: <AlertCircle size={18} className="text-rose-500" />, ring: "ring-rose-500/20" },
  info: { icon: <Info size={18} className="text-brand-500" />, ring: "ring-brand-500/20" },
};

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    return subscribeToasts((t) => {
      setItems((p) => [...p, t]);
      setTimeout(() => setItems((p) => p.filter((x) => x.id !== t.id)), 4000);
    });
  }, []);

  const dismiss = (id: number) => setItems((p) => p.filter((x) => x.id !== id));

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {items.map((t) => (
        <div key={t.id}
          className={`pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl ring-4 ${STYLE[t.type].ring} dark:border-slate-700 dark:bg-slate-800`}
          style={{ animation: "fadeup 0.25s ease-out both" }}>
          <span className="mt-0.5 shrink-0">{STYLE[t.type].icon}</span>
          <p className="flex-1 text-sm text-slate-700 dark:text-slate-200">{t.message}</p>
          <button onClick={() => dismiss(t.id)} className="shrink-0 text-slate-400 hover:text-slate-600">
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
