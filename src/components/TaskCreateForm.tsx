"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { createTaskAction } from "@/app/actions/tasks";
import { Card } from "@/components/ui";

export function TaskCreateForm({ users }: { users: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createTaskAction, null);
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <button onClick={() => setOpen((o) => !o)} className="btn-primary w-full">
        <Plus size={16} /> New Task
      </button>
      {open && (
        <form
          key={state?.ok ? "reset" : "form"}
          action={(fd) => { formAction(fd); }}
          className="mt-3 space-y-3"
        >
          <input name="title" className="input" placeholder="Task title" required />
          <textarea name="description" rows={3} className="input" placeholder="Details / instructions…" />
          <div>
            <label className="label">Assign to</label>
            <select name="assigneeId" className="input">
              <option value="">Myself</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select name="priority" className="input">
              {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => <option key={p}>{p}</option>)}
            </select>
            <input name="dueDate" type="date" className="input" />
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state?.ok && <p className="text-sm text-emerald-600">Task assigned ✅</p>}
          <button type="submit" className="btn-primary w-full" disabled={pending}>
            {pending ? "Assigning…" : "Assign Task"}
          </button>
        </form>
      )}
    </Card>
  );
}
