import Link from "next/link";
import { Eye, MessageSquare } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader, Badge, EmptyState } from "@/components/ui";
import { TaskCreateForm } from "@/components/TaskCreateForm";
import { TaskSearch } from "@/components/TaskSearch";
import { formatDateTime } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const me = await getCurrentUser();
  if (!me) return null;
  const { q } = await searchParams;

  // tasks where I'm the assigner OR the assignee
  const where: Prisma.TaskWhereInput = {
    OR: [{ creatorId: me.id }, { assigneeId: me.id }],
  };
  if (q && q.trim()) {
    const term = q.trim();
    where.AND = {
      OR: [
        { title: { contains: term, mode: "insensitive" } },
        { code: { contains: term, mode: "insensitive" } },
        { assignee: { name: { contains: term, mode: "insensitive" } } },
        { creator: { name: { contains: term, mode: "insensitive" } } },
      ],
    };
  }

  const [tasks, users] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        assignee: { select: { name: true } },
        creator: { select: { name: true } },
        _count: { select: { messages: true } },
      },
      take: 100,
    }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <PageHeader title="Task Management" subtitle="Assign, track & verify work — every task is a ticket with a unique token." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <TaskSearch />
          {tasks.length === 0 ? (
            <EmptyState message="No tasks yet. Assign one from the panel on the right." />
          ) : (
            tasks.map((t) => {
              const mineToDo = t.assigneeId === me.id;
              return (
                <Link key={t.id} href={`/tasks/${t.id}`} className="card block p-4 transition hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {t.code && <span className="badge bg-slate-100 font-mono text-[10px] text-slate-500">{t.code}</span>}
                        <p className="font-medium text-slate-800">{t.title}</p>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {mineToDo ? `Assigned to you by ${t.creator?.name ?? "—"}` : `${t.assignee?.name ?? "Unassigned"}'s task`}
                        {" · "}{formatDateTime(t.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {t.seenAt && t.status !== "ASSIGNED" && (
                        <span className="flex items-center gap-1 text-[10px] text-blue-500"><Eye size={12} /> Seen</span>
                      )}
                      {t._count.messages > 0 && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-400"><MessageSquare size={11} /> {t._count.messages}</span>
                      )}
                      <Badge value={t.priority} />
                      <Badge value={t.status} />
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>

        <div>
          <TaskCreateForm users={users.filter((u) => u.id !== me.id)} />
        </div>
      </div>
    </div>
  );
}
