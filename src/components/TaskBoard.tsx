"use client";

import { useActionState, useState, useTransition } from "react";
import { Plus, Check, Circle, Clock } from "lucide-react";
import { createTaskAction, setTaskStatusAction } from "@/app/actions/tasks";
import { Card, Badge } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import type { TaskStatus } from "@prisma/client";

interface Task {
  id: string; title: string; description: string | null; status: TaskStatus;
  priority: string; dueDate: Date | null; assignee: { name: string } | null;
}

export function TaskBoard({
  tasks, users,
}: {
  tasks: Task[];
  users: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(createTaskAction, null);
  const [open, setOpen] = useState(false);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="space-y-2">
          {tasks.length === 0 && (
            <p className="card p-8 text-center text-sm text-slate-400">No tasks yet.</p>
          )}
          {tasks.map((t) => <TaskItem key={t.id} t={t} />)}
        </div>
      </div>

      <div>
        <Card>
          <button onClick={() => setOpen((o) => !o)} className="btn-primary mb-3 w-full">
            <Plus size={16} /> New Task
          </button>
          {open && (
            <form action={formAction} className="space-y-3">
              <input name="title" className="input" placeholder="Task title" required />
              <textarea name="description" rows={2} className="input" placeholder="Details…" />
              <select name="assigneeId" className="input">
                <option value="">Assign to me</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <select name="priority" className="input">
                {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => <option key={p}>{p}</option>)}
              </select>
              <input name="dueDate" type="date" className="input" />
              {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
              <button type="submit" className="btn-primary w-full" disabled={pending}>
                {pending ? "Adding…" : "Add Task"}
              </button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}

function TaskItem({ t }: { t: Task }) {
  const [pending, start] = useTransition();
  const next: Record<TaskStatus, TaskStatus> = {
    TODO: "IN_PROGRESS", IN_PROGRESS: "DONE", DONE: "TODO", CANCELLED: "TODO",
  };
  const Icon = t.status === "DONE" ? Check : t.status === "IN_PROGRESS" ? Clock : Circle;
  return (
    <div className="card flex items-center gap-3 p-4">
      <button
        onClick={() => start(() => setTaskStatusAction(t.id, next[t.status]))}
        disabled={pending}
        className={`flex h-6 w-6 items-center justify-center rounded-full border ${t.status === "DONE" ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-slate-400"}`}
      >
        <Icon size={14} />
      </button>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${t.status === "DONE" ? "text-slate-400 line-through" : "text-slate-800"}`}>
          {t.title}
        </p>
        {t.description && <p className="truncate text-xs text-slate-400">{t.description}</p>}
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Badge value={t.priority} />
        {t.assignee && <span>{t.assignee.name}</span>}
        {t.dueDate && <span>{formatDate(t.dueDate)}</span>}
      </div>
    </div>
  );
}
