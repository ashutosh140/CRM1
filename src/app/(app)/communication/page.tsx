import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { TeamChat } from "@/components/TeamChat";

export default async function CommunicationPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const contacts = await prisma.user.findMany({
    where: { isActive: true, id: { not: me.id } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true },
  });

  return (
    <div>
      <PageHeader
        title="Communication Center"
        subtitle="Team chat — message any colleague and share files, like WhatsApp."
      />
      <TeamChat meId={me.id} contacts={contacts} />
    </div>
  );
}
