"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { moveLeadStageAction } from "@/app/actions/leads";
import { formatCurrency } from "@/lib/utils";

interface LeadCard {
  id: string;
  name: string;
  company: string | null;
  estimatedValue: number;
  score: number;
  stageId: string | null;
  owner: { name: string } | null;
}
interface Stage {
  id: string;
  name: string;
  color: string;
  probability: number;
}

export function PipelineBoard({ stages, leads }: { stages: Stage[]; leads: LeadCard[] }) {
  const [items, setItems] = useState(leads);
  const [, start] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);

  function moveTo(stageId: string) {
    if (!dragId) return;
    const id = dragId;
    setItems((prev) => prev.map((l) => (l.id === id ? { ...l, stageId } : l)));
    start(() => moveLeadStageAction(id, stageId));
    setDragId(null);
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map((stage) => {
        const colLeads = items.filter((l) => l.stageId === stage.id);
        const value = colLeads.reduce((s, l) => s + l.estimatedValue, 0);
        return (
          <div
            key={stage.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => moveTo(stage.id)}
            className="flex w-72 shrink-0 flex-col rounded-xl bg-slate-100/70 p-3"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: stage.color }} />
                <span className="text-sm font-semibold text-slate-700">{stage.name}</span>
                <span className="rounded-full bg-white px-2 text-xs text-slate-500">{colLeads.length}</span>
              </div>
              <span className="text-[10px] text-slate-400">{stage.probability}%</span>
            </div>
            <p className="mb-2 text-xs text-slate-400">{formatCurrency(value)}</p>
            <div className="flex flex-col gap-2">
              {colLeads.map((lead) => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={() => setDragId(lead.id)}
                  className="cursor-grab rounded-lg border border-slate-200 bg-white p-3 shadow-sm active:cursor-grabbing"
                >
                  <Link href={`/leads/${lead.id}`} className="text-sm font-medium text-slate-800 hover:text-brand-600">
                    {lead.name}
                  </Link>
                  <p className="text-xs text-slate-400">{lead.company ?? "—"}</p>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-slate-600">{formatCurrency(lead.estimatedValue)}</span>
                    <span className={`rounded px-1.5 py-0.5 font-medium ${lead.score >= 70 ? "bg-emerald-50 text-emerald-600" : lead.score >= 40 ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"}`}>
                      {lead.score}
                    </span>
                  </div>
                </div>
              ))}
              {colLeads.length === 0 && (
                <p className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-xs text-slate-300">
                  Drop here
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
