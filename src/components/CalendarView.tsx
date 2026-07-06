"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, CheckSquare, Clock } from "lucide-react";
import { createEventAction, deleteEventAction } from "@/app/actions/calendar";
import { Card } from "@/components/ui";
import { toast } from "@/lib/toast";

interface Evt { id: string; title: string; date: string; allDay: boolean; notes: string | null; color: string | null; }
interface Tsk { id: string; title: string; date: string; }

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const COLORS: Record<string, { chip: string; dot: string; bar: string }> = {
  indigo: { chip: "bg-brand-100 text-brand-700 dark:bg-brand-500/20", dot: "bg-brand-500", bar: "border-l-brand-500" },
  emerald: { chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20", dot: "bg-emerald-500", bar: "border-l-emerald-500" },
  amber: { chip: "bg-amber-100 text-amber-700 dark:bg-amber-500/20", dot: "bg-amber-500", bar: "border-l-amber-500" },
  rose: { chip: "bg-rose-100 text-rose-700 dark:bg-rose-500/20", dot: "bg-rose-500", bar: "border-l-rose-500" },
  sky: { chip: "bg-sky-100 text-sky-700 dark:bg-sky-500/20", dot: "bg-sky-500", bar: "border-l-sky-500" },
  violet: { chip: "bg-violet-100 text-violet-700 dark:bg-violet-500/20", dot: "bg-violet-500", bar: "border-l-violet-500" },
};
const colorOf = (c: string | null) => COLORS[c || "indigo"] || COLORS.indigo;
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

type View = "month" | "week" | "day";

export function CalendarView({ events, tasks }: { events: Evt[]; tasks: Tsk[] }) {
  const today = new Date();
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selected, setSelected] = useState<string>(ymd(today));
  const [pickColor, setPickColor] = useState("indigo");
  const [pending, start] = useTransition();

  const byDay = useMemo(() => {
    const map = new Map<string, { events: Evt[]; tasks: Tsk[] }>();
    const add = (k: string) => { if (!map.has(k)) map.set(k, { events: [], tasks: [] }); return map.get(k)!; };
    for (const e of events) add(ymd(new Date(e.date))).events.push(e);
    for (const t of tasks) add(ymd(new Date(t.date))).tasks.push(t);
    return map;
  }, [events, tasks]);

  const selDate = new Date(selected + "T00:00");

  const shift = (dir: number) => {
    if (view === "month") {
      const d = new Date(cursor.y, cursor.m + dir, 1);
      setCursor({ y: d.getFullYear(), m: d.getMonth() });
    } else {
      const d = new Date(selDate); d.setDate(d.getDate() + dir * (view === "week" ? 7 : 1));
      setSelected(ymd(d)); setCursor({ y: d.getFullYear(), m: d.getMonth() });
    }
  };
  const goToday = () => { setSelected(ymd(today)); setCursor({ y: today.getFullYear(), m: today.getMonth() }); };

  // header label
  const weekDays = () => {
    const start = new Date(selDate); start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  };
  const headerLabel = view === "month" ? `${MONTHS[cursor.m]} ${cursor.y}`
    : view === "day" ? selDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : (() => { const w = weekDays(); return `${w[0].toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${w[6].toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`; })();

  function add(fd: FormData) {
    fd.set("date", selected); fd.set("color", pickColor);
    start(async () => {
      const r = await createEventAction(null, fd);
      if (r?.error) toast(r.error, "error"); else toast("Event added ✅", "success");
    });
  }
  function del(id: string) { start(async () => { await deleteEventAction(id); toast("Event removed", "info"); }); }

  const sel = byDay.get(selected) || { events: [], tasks: [] };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        {/* toolbar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{headerLabel}</h2>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 p-0.5 text-xs dark:border-slate-700">
              {(["month", "week", "day"] as View[]).map((v) => (
                <button key={v} onClick={() => setView(v)}
                  className={`rounded-md px-2.5 py-1 capitalize ${view === v ? "bg-brand-600 text-white" : "text-slate-500 hover:text-slate-800"}`}>{v}</button>
              ))}
            </div>
            <button onClick={goToday} className="btn-ghost px-2 text-xs">Today</button>
            <button onClick={() => shift(-1)} className="btn-ghost px-2"><ChevronLeft size={16} /></button>
            <button onClick={() => shift(1)} className="btn-ghost px-2"><ChevronRight size={16} /></button>
          </div>
        </div>

        {view === "month" && <MonthGrid cursor={cursor} byDay={byDay} today={today} selected={selected} onSelect={setSelected} />}
        {view === "week" && <WeekView days={weekDays()} byDay={byDay} today={today} selected={selected} onSelect={setSelected} />}
        {view === "day" && <DayView date={selDate} items={sel} onDelete={del} pending={pending} />}
      </Card>

      {/* Add / day panel */}
      <Card>
        <div className="mb-3 flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${colorOf(pickColor).dot}`} />
          <h2 className="font-semibold text-slate-900 dark:text-white">
            {selDate.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
          </h2>
        </div>

        <div className="mb-4 max-h-56 space-y-2 overflow-y-auto">
          {sel.events.length === 0 && sel.tasks.length === 0 && (
            <p className="py-4 text-center text-sm text-slate-400">Nothing scheduled. Add below.</p>
          )}
          {sel.tasks.map((t) => (
            <div key={t.id} className="flex items-center gap-2 rounded-lg border-l-4 border-l-amber-500 bg-amber-50 px-3 py-2 text-sm dark:bg-amber-500/10">
              <CheckSquare size={14} className="text-amber-600" />
              <span className="flex-1 text-slate-700 dark:text-slate-200">{t.title}</span>
              <span className="text-xs text-amber-600">Task due</span>
            </div>
          ))}
          {sel.events.map((e) => (
            <div key={e.id} className={`flex items-start gap-2 rounded-lg border border-l-4 ${colorOf(e.color).bar} border-slate-200 px-3 py-2 text-sm dark:border-slate-700`}>
              <div className="flex-1">
                <p className="font-medium text-slate-800 dark:text-slate-100">{e.title}</p>
                {!e.allDay && <p className="flex items-center gap-1 text-xs text-slate-400"><Clock size={11} /> {fmtTime(e.date)}</p>}
                {e.notes && <p className="mt-0.5 text-xs text-slate-500">{e.notes}</p>}
              </div>
              <button onClick={() => del(e.id)} disabled={pending} className="text-slate-400 hover:text-rose-500"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>

        <form action={add} className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-700">
          <input name="title" className="input" placeholder="Add event / reminder…" required />
          <div className="grid grid-cols-2 gap-2">
            <input name="time" type="time" className="input" title="Time (optional)" />
            <input name="notes" className="input" placeholder="Notes (optional)" />
          </div>
          <div className="flex items-center gap-1.5">
            {Object.keys(COLORS).map((c) => (
              <button key={c} type="button" onClick={() => setPickColor(c)}
                className={`h-5 w-5 rounded-full ${COLORS[c].dot} ${pickColor === c ? "ring-2 ring-offset-1 ring-slate-400" : ""}`} title={c} />
            ))}
          </div>
          <button type="submit" disabled={pending} className="btn-primary w-full">
            <Plus size={16} /> {pending ? "Adding…" : "Add to this day"}
          </button>
        </form>
      </Card>
    </div>
  );
}

function MonthGrid({ cursor, byDay, today, selected, onSelect }: {
  cursor: { y: number; m: number }; byDay: Map<string, { events: Evt[]; tasks: Tsk[] }>;
  today: Date; selected: string; onSelect: (k: string) => void;
}) {
  const first = new Date(cursor.y, cursor.m, 1);
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(first.getDay()).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(cursor.y, cursor.m, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase text-slate-400">
        {WD.map((d) => <div key={d} className="pb-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const k = ymd(d); const items = byDay.get(k);
          const isToday = k === ymd(today); const isSel = k === selected;
          const count = (items?.events.length || 0) + (items?.tasks.length || 0);
          return (
            <button key={i} onClick={() => onSelect(k)}
              className={`flex min-h-[80px] flex-col rounded-lg border p-1.5 text-left transition ${isSel ? "border-brand-400 bg-brand-50 dark:bg-brand-500/10" : "border-slate-100 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/40"}`}>
              <span className={`mb-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday ? "bg-brand-600 font-semibold text-white" : "text-slate-600 dark:text-slate-300"}`}>{d.getDate()}</span>
              <div className="space-y-0.5 overflow-hidden">
                {items?.events.slice(0, 2).map((e) => (
                  <span key={e.id} className={`block truncate rounded px-1 text-[10px] ${colorOf(e.color).chip}`}>{e.allDay ? "" : fmtTime(e.date).replace(/\s/g, "") + " "}{e.title}</span>
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
    </>
  );
}

function WeekView({ days, byDay, today, selected, onSelect }: {
  days: Date[]; byDay: Map<string, { events: Evt[]; tasks: Tsk[] }>;
  today: Date; selected: string; onSelect: (k: string) => void;
}) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((d) => {
        const k = ymd(d); const items = byDay.get(k);
        const isToday = k === ymd(today); const isSel = k === selected;
        return (
          <button key={k} onClick={() => onSelect(k)}
            className={`flex min-h-[220px] flex-col rounded-lg border p-1.5 text-left transition ${isSel ? "border-brand-400 bg-brand-50 dark:bg-brand-500/10" : "border-slate-100 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/40"}`}>
            <div className="mb-1 text-center">
              <p className="text-[10px] uppercase text-slate-400">{WD[d.getDay()]}</p>
              <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday ? "bg-brand-600 font-semibold text-white" : "text-slate-600 dark:text-slate-300"}`}>{d.getDate()}</span>
            </div>
            <div className="space-y-1 overflow-y-auto">
              {items?.tasks.map((t) => (
                <span key={t.id} className="block truncate rounded bg-amber-100 px-1 py-0.5 text-[10px] text-amber-700 dark:bg-amber-500/20">⏰ {t.title}</span>
              ))}
              {items?.events.map((e) => (
                <span key={e.id} className={`block truncate rounded px-1 py-0.5 text-[10px] ${colorOf(e.color).chip}`}>{e.allDay ? "" : fmtTime(e.date).replace(/\s/g, "") + " "}{e.title}</span>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function DayView({ date, items, onDelete, pending }: {
  date: Date; items: { events: Evt[]; tasks: Tsk[] }; onDelete: (id: string) => void; pending: boolean;
}) {
  const all = [
    ...items.tasks.map((t) => ({ kind: "task" as const, id: t.id, title: t.title, time: null as string | null, notes: null as string | null, color: "amber" })),
    ...items.events.map((e) => ({ kind: "event" as const, id: e.id, title: e.title, time: e.allDay ? null : e.date, notes: e.notes, color: e.color || "indigo" })),
  ].sort((a, b) => (a.time || "0").localeCompare(b.time || "0"));

  return (
    <div className="space-y-2">
      {all.length === 0 && <p className="py-16 text-center text-sm text-slate-400">Nothing scheduled for {date.toLocaleDateString("en-IN", { day: "numeric", month: "long" })}.</p>}
      {all.map((it) => (
        <div key={it.kind + it.id} className={`flex items-center gap-3 rounded-lg border border-l-4 ${colorOf(it.color).bar} border-slate-200 px-4 py-3 dark:border-slate-700`}>
          <div className="w-20 shrink-0 text-xs text-slate-400">{it.time ? fmtTime(it.time) : "All day"}</div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{it.kind === "task" ? "⏰ " : ""}{it.title}</p>
            {it.notes && <p className="text-xs text-slate-500">{it.notes}</p>}
          </div>
          {it.kind === "event" && (
            <button onClick={() => onDelete(it.id)} disabled={pending} className="text-slate-400 hover:text-rose-500"><Trash2 size={14} /></button>
          )}
        </div>
      ))}
    </div>
  );
}
