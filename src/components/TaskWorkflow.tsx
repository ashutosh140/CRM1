"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Send, CheckCircle2, RotateCcw, ClipboardCheck } from "lucide-react";
import {
  markSeenAction, postTaskMessageAction, submitCompletionAction,
  verifyDoneAction, reassignAction,
} from "@/app/actions/tasks";

export function TaskWorkflow({
  taskId, status, isAssignee, isAssigner, users,
}: {
  taskId: string; status: string; isAssignee: boolean; isAssigner: boolean;
  users: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  // assignee auto marks the ticket as seen on open
  useEffect(() => {
    if (isAssignee && status === "ASSIGNED") {
      start(async () => { await markSeenAction(taskId); router.refresh(); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <MessageBox taskId={taskId} onDone={() => router.refresh()} />

      {isAssignee && status !== "DONE" && (
        <CompletionBox taskId={taskId} onDone={() => router.refresh()} />
      )}

      {isAssigner && (
        <div className="flex flex-wrap gap-2">
          {status === "COMPLETED" && (
            <button className="btn-primary" disabled={pending}
              onClick={() => start(async () => { await verifyDoneAction(taskId); router.refresh(); })}>
              <CheckCircle2 size={16} /> Verify &amp; Mark Done
            </button>
          )}
          {status !== "DONE" && <ReassignBox taskId={taskId} users={users} onDone={() => router.refresh()} />}
        </div>
      )}

      {status === "DONE" && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 size={16} /> This ticket is verified and marked as done.
        </div>
      )}
    </div>
  );
}

function MessageBox({ taskId, onDone }: { taskId: string; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(async (p: unknown, fd: FormData) => {
    const r = await postTaskMessageAction(p, fd); if (r?.ok) onDone(); return r;
  }, null);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <form action={(fd) => { formAction(fd); if (ref.current) ref.current.value = ""; }} className="flex gap-2">
      <input type="hidden" name="taskId" value={taskId} />
      <input ref={ref} name="body" className="input" placeholder="Write a message in this ticket…" />
      <button type="submit" className="btn-ghost" disabled={pending}><Send size={16} /></button>
      {state?.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}

function CompletionBox({ taskId, onDone }: { taskId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (p: unknown, fd: FormData) => {
    const r = await submitCompletionAction(p, fd); if (r?.ok) { setOpen(false); onDone(); } return r;
  }, null);

  if (!open) return (
    <button onClick={() => setOpen(true)} className="btn-primary"><ClipboardCheck size={16} /> Mark Complete</button>
  );
  return (
    <form action={formAction} className="space-y-2 rounded-lg border border-slate-200 p-3">
      <input type="hidden" name="taskId" value={taskId} />
      <label className="label">What did you complete? (confirmation note)</label>
      <textarea name="note" rows={3} className="input" placeholder="e.g. Sent the proposal, called the client, shared the deck…" required />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
        <button type="submit" className="btn-primary" disabled={pending}>{pending ? "Submitting…" : "Submit Completion"}</button>
      </div>
    </form>
  );
}

function ReassignBox({ taskId, users, onDone }: { taskId: string; users: { id: string; name: string }[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (p: unknown, fd: FormData) => {
    const r = await reassignAction(p, fd); if (r?.ok) { setOpen(false); onDone(); } return r;
  }, null);

  if (!open) return (
    <button onClick={() => setOpen(true)} className="btn-ghost"><RotateCcw size={16} /> Reassign / Reopen</button>
  );
  return (
    <form action={formAction} className="w-full space-y-2 rounded-lg border border-slate-200 p-3">
      <input type="hidden" name="taskId" value={taskId} />
      <label className="label">Instructions (what to fix / do next)</label>
      <textarea name="instructions" rows={2} className="input" placeholder="e.g. This wasn't done properly — please redo the X part." required />
      <select name="assigneeId" className="input">
        <option value="">Keep same assignee</option>
        {users.map((u) => <option key={u.id} value={u.id}>Reassign to {u.name}</option>)}
      </select>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
        <button type="submit" className="btn-primary" disabled={pending}>{pending ? "Reassigning…" : "Reassign"}</button>
      </div>
    </form>
  );
}
