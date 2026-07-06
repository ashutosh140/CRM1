import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { NotesApp } from "@/components/NotesApp";

export default async function NotesPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const notes = await prisma.note.findMany({
    where: { userId: me.id },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  });

  return (
    <div>
      <PageHeader title="Notes" subtitle="Your private notebook — jot down anything, only you can see it." />
      <NotesApp
        notes={notes.map((n) => ({
          id: n.id, title: n.title, body: n.body, pinned: n.pinned,
          updatedAt: n.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
