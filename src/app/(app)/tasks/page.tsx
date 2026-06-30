import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { TaskBoard } from "@/components/TaskBoard";

export default async function TasksPage() {
  const [tasks, users] = await Promise.all([
    prisma.task.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { assignee: { select: { name: true } } },
      take: 100,
    }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <PageHeader title="Task Management" subtitle="Assign tasks and monitor progress. Click the circle to advance status." />
      <TaskBoard tasks={tasks} users={users} />
    </div>
  );
}
