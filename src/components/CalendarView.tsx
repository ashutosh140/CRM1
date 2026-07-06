"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, CheckSquare, CalendarDays } from "lucide-react";
import { createEventAction, deleteEventAction } from "@/app/actions/calendar";
import { Card } from "@/components/ui";
import { toast } from "@/lib/toast";

interface Evt { id: string; title: string; date: string; allDay: boolean; notes: string | null; color: string | null; }
interface Tsk { id: string; title: string; date: string; }

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function CalendarView({ events, tasks }: { events: Evt[]; tasks: Tsk[] }) {
  const today = new Date();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selected, setSelected] = useState<string>(ymd(today));
  const [pending, start] = useTransition();

  // map day-key -> items
  const byDay = useMemo(() => {
    const map = new Map<string, { events: Evt[]; tasks: Tsk[] }>();
    for (const e of events) {
      const k = ymd(new Date(e.date));
      if (!map.has(k)) map.set(k, { events: [], tasks: [] });
      map.get(k)!.events.push(e);
    }
    for (const t of tasks) {
      const k = ymd(new Date(t.date));
      if (!map.has(k)) map.set(k, { events: [], tasks: [] });
      map.get(k)!.tasks.push(t);
    }
    return map;
  }, [events, tasks]);

  const first = new Date(cursor.y, cursor.m, 1);
  const startBlank = first.getDay();
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(startBlank).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(cursor.y, cursor.m, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const move = (delta: number) => {
    const d = new Date(cursor.y, cursor.m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };

  const sel = byDay.get(selected) || { events: [], tasks: [] };

  function add(fd: FormData) {
    fd.set("date", selected);
    start(async () => {
      const r = await createEventAction(null, fd);
      if (r?.error) toast(r.error, "error");
      else toast("Event added ✅", "success");
    });
  }
  function del(id: string) {
    start(async () => { await deleteEventAction(id); toast("Event removed", "info"); });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Month grid */}
      <Card className="lg:col-span-2">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">{MONTHS[cursor.m]} {cursor.y}</h2>
          <div className="flex items-center gap-1">
            <button onClick={() => setCursor({ y: today.getFullYear(), m: today.getMonth() })} className="btn-ghost px-2 text-xs">Today</button>
            <button onClick={() => move(-1)} className="btn-ghost px-2"><ChevronLeft size={16} /></button>
            <button onClick={() => move(1)} className="btn-ghost px-2"><ChevronRight size={16} /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase text-slate-400">
          {WD.map((d) => <div key={d} className="pb-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const k = ymd(d);
            const items = byDay.get(k);
            const isToday = k === ymd(today);
            const isSel = k === selected;
            const count = (items?.events.length || 0) + (items?.tasks.length || 0);
            return (
              <button key={i} onClick={() => setSelected(k)}
                className={`flex min-h-[72px] flex-col rounded-lg border p-1.5 text-left transition ${isSel ? "border-brand-400 bg-brand-50 dark:bg-brand-500/10" : "border-slate-100 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/40"}`}>
                <span className={`mb-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday ? "bg-brand-600 font-semibold text-white" : "text-slate-600 dark:text-slate-300"}`}>{d.getDate()}</span>
                <div className="space-y-0.5 overflow-hidden">
                  {items?.events.slice(0, 2).map((e) => (
                    <span key={e.id} className="block truncate rounded bg-brand-100 px-1 text-[10px] text-brand-700 dark:bg-brand-500/20">{e.title}</span>
                  ))}
                  {items?.tasks.slice(0, 1).map((t) => (
                    <span key={t.id} className="block truncate rounded bg-amber-100 px-1 text-[10px] text-amber-700 dark:bg-amber-500/20">⏰ {t.title}</span>
                  ))}
                  {count > 3 && <span className="text-[10px] text-slate-400">+{count - 3} more</span>}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Day panel */}
      <Card>
        <div className="mb-3 flex items-center gap-2">
          <CalendarDays size={18} className="text-brand-600" />
          <h2 className="font-semibold text-slate-900">
            {new Date(selected + "T00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
          </h2>
        </div>

        <div className="mb-4 space-y-2">
          {sel.events.length === 0 && sel.tasks.length === 0 && (
            <p className="py-4 text-center text-sm text-slate-400">Nothing scheduled. Add an event below.</p>
          )}
          {sel.tasks.map((t) => (
            <div key={t.id} className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm dark:bg-amber-500/10">
              <CheckSquare size={14} className="text-amber-600" />
              <span className="flex-1 text-slate-700 dark:text-slate-200">{t.title}</span>
              <span className="text-xs text-amber-600">Task due</span>
            </div>
          ))}
          {sel.events.map((e) => (
            <div key={e.id} className="flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
              <div className="flex-1">
                <p className="font-medium text-slate-800 dark:text-slate-100">{e.title}</p>
                {!e.allDay && <p className="text-xs text-slate-400">{new Date(e.date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}</p>}
                {e.notes && <p className="mt-0.5 text-xs text-slate-500">{e.notes}</p>}
              </div>
              <button onClick={() => del(e.id)} disabled={pending} className="text-slate-400 hover:text-rose-500"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>

        <form action={add} className="space-y-2 border-t border-slate-100 pt-3">
          <input name="title" className="input" placeholder="Add event / reminder…" required />
          <div className="grid grid-cols-2 gap-2">
            <input name="time" type="time" className="input" title="Time (optional)" />
            <input name="notes" className="input" placeholder="Notes (optional)" />
          </div>
          <button type="submit" disabled={pending} className="btn-primary w-full">
            <Plus size={16} /> {pending ? "Adding…" : "Add to this day"}
          </button>
        </form>
      </Card>
    </div>
  );
}
