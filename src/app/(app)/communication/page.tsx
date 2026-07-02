import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { TeamChat } from "@/components/TeamChat";

export default async function CommunicationPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  // Server-render the initial contacts/groups so the list is never empty on load.
  let contacts: { id: string; name: string; email: string; role: typeof me.role; unread: number }[] = [];
  let groups: { id: string; name: string; members: number }[] = [];
  try {
    const [users, grp] = await Promise.all([
      prisma.user.findMany({
        where: { isActive: true, id: { not: me.id } },
        orderBy: { name: "asc" },
        select: { id: true, name: true, email: true, role: true },
      }),
      me.role === "ADMIN"
        ? prisma.group.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, name: true, _count: { select: { members: true } } } })
        : prisma.group.findMany({ where: { members: { some: { userId: me.id } } }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, _count: { select: { members: true } } } }),
    ]);
    contacts = users.map((u) => ({ ...u, unread: 0 }));
    groups = grp.map((g) => ({ id: g.id, name: g.name, members: g._count.members }));
  } catch {
    /* fall back to client polling */
  }

  return (
    <div>
      <PageHeader
        title="Communication Center"
        subtitle="Team chat & groups — message colleagues and share files, like WhatsApp."
      />
      <TeamChat meId={me.id} meRole={me.role} initialContacts={contacts} initialGroups={groups} />
    </div>
  );
}
