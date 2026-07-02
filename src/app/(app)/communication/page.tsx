import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { TeamChat } from "@/components/TeamChat";

export default async function CommunicationPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  return (
    <div>
      <PageHeader
        title="Communication Center"
        subtitle="Team chat & groups — message colleagues and share files, like WhatsApp."
      />
      <TeamChat meId={me.id} meRole={me.role} />
    </div>
  );
}
