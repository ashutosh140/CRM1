import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Eye, User2, CheckCircle2, RotateCcw, ClipboardCheck, MessageSquare } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Card, Badge, PageHeader } from "@/components/ui";
import { TaskWorkflow } from "@/components/TaskWorkflow";
import { formatDateTime, initials } from "@/lib/utils";

const KIND_STYLE: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  MESSAGE: { label: "", cls: "", icon: <MessageSquare size={12} /> },
  COMPLETION: { label: "Completion", cls: "border-amber-200 bg-amber-50", icon: <ClipboardCheck size={12} className="text-amber-600" /> },
  REASSIGN: { label: "Reassigned", cls: "border-rose-200 bg-rose-50", icon: <RotateCcw size={12} className="text-rose-600" /> },
  VERIFIED: { label: "Verified", cls: "border-emerald-200 bg-emerald-50", icon: <CheckCircle2 size={12} className="text-emerald-600" /> },
};

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const { id } = await params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      assignee: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } },
      messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { name: true } } } },
    },
  });
  if (!task) notFound();

  const isAssignee = task.assigneeId === me.id;
  const isAssigner = task.creatorId === me.id;
  if (!isAssignee && !isAssigner && me.role !== "ADMIN") notFound();

  const users = await prisma.user.findMany({
    where: { isActive: true, id: { not: me.id } },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/tasks" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={16} /> Back to tasks
      </Link>

      <PageHeader
        title={task.title}
        subtitle={[task.code, task.priority].filter(Boolean).join(" · ")}
        action={<Badge value={task.status} />}
      />

      <Card className="mb-6">
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <Meta icon={<User2 size={14} />} label="Assigned to" value={task.assignee?.name ?? "—"} />
          <Meta icon={<User2 size={14} />} label="Assigned by" value={task.creator?.name ?? "—"} />
          <Meta icon={<Eye size={14} />} label="Seen" value={task.seenAt ? formatDateTime(task.seenAt) : "Not yet"} />
          <Meta label="Due" value={task.dueDate ? formatDateTime(task.dueDate) : "—"} />
        </div>
        {task.description && (
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            <p className="mb-1 text-xs font-medium text-slate-400">Details</p>
            {task.description}
          </div>
        )}
        <p className="mt-3 text-xs text-slate-400">Created {formatDateTime(task.createdAt)}</p>
      </Card>

      {/* Conversation thread */}
      <Card className="mb-6">
        <h2 className="mb-3 font-semibold text-slate-900">Conversation</h2>
        {task.messages.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">No messages yet. Start the conversation below.</p>
        ) : (
          <div className="space-y-3">
            {task.messages.map((m) => {
              const style = KIND_STYLE[m.kind] ?? KIND_STYLE.MESSAGE;
              const mine = m.sender?.name && m.senderId === me.id;
              return (
                <div key={m.id} className={`flex gap-3 ${mine ? "flex-row-reverse" : ""}`}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-700">
                    {initials(m.sender?.name ?? "?")}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl border px-3 py-2 text-sm ${style.cls || "border-slate-200 bg-white"}`}>
                    {style.label && (
                      <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase text-slate-500">
                        {style.icon} {style.label}
                      </p>
                    )}
                    <p className="text-slate-700">{m.body}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{m.sender?.name} · {formatDateTime(m.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Role-based actions */}
      <TaskWorkflow
        taskId={task.id}
        status={task.status}
        isAssignee={isAssignee}
        isAssigner={isAssigner}
        users={users}
      />
    </div>
  );
}

function Meta({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <p className="flex items-center gap-1 text-xs text-slate-400">{icon} {label}</p>
      <p className="mt-0.5 text-slate-700">{value}</p>
    </div>
  );
}
