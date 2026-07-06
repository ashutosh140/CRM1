import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { CalendarView } from "@/components/CalendarView";

export default async function CalendarPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const [events, tasks] = await Promise.all([
    prisma.calendarEvent.findMany({ where: { userId: me.id }, orderBy: { date: "asc" } }),
    prisma.task.findMany({
      where: { assigneeId: me.id, dueDate: { not: null }, status: { not: "DONE" } },
      select: { id: true, title: true, dueDate: true },
    }),
  ]);

  return (
    <div>
      <PageHeader title="My Calendar" subtitle="Your personal calendar — events, reminders & task due-dates, all in one place." />
      <CalendarView
        events={events.map((e) => ({
          id: e.id, title: e.title, date: e.date.toISOString(),
          allDay: e.allDay, notes: e.notes, color: e.color,
        }))}
        tasks={tasks.map((t) => ({ id: t.id, title: t.title, date: t.dueDate!.toISOString() }))}
      />
    </div>
  );
}
