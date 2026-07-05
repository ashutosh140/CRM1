import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { taskScope } from "@/lib/scope";
import { PageHeader, EmptyState } from "@/components/ui";
import { TaskCreateForm } from "@/components/TaskCreateForm";
import { TaskSearch } from "@/components/TaskSearch";
import { TaskRow } from "@/components/TaskRow";
import type { Prisma } from "@prisma/client";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const me = await getCurrentUser();
  if (!me) return null;
  const { q } = await searchParams;

  // SALES/EMPLOYEE: only tasks I created or am assigned. MANAGER+: all tasks.
  const where: Prisma.TaskWhereInput = { ...taskScope(me) };
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="space-y-4 lg:col-span-3">
          <TaskSearch />
          {tasks.length === 0 ? (
            <EmptyState message="No tasks yet. Assign one from the panel on the right." />
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Task</th>
                      <th className="px-4 py-3 font-medium">Person</th>
                      <th className="px-4 py-3 font-medium">Priority</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Seen</th>
                      <th className="px-4 py-3 font-medium">Msgs</th>
                      <th className="px-4 py-3 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((t) => (
                      <TaskRow key={t.id} task={{
                        id: t.id, code: t.code, title: t.title,
                        personLabel: t.assigneeId === me.id
                          ? `Assigned to you by ${t.creator?.name ?? "—"}`
                          : `${t.assignee?.name ?? "Unassigned"}'s task`,
                        priority: t.priority, status: t.status,
                        seen: Boolean(t.seenAt) && t.status !== "ASSIGNED",
                        msgCount: t._count.messages, createdAt: t.createdAt.toISOString(),
                      }} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div>
          <TaskCreateForm users={users.filter((u) => u.id !== me.id)} />
        </div>
      </div>
    </div>
  );
}
