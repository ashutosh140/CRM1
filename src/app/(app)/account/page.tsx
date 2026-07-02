import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { AccountForm } from "@/components/AccountForm";

export default async function AccountPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  return (
    <div>
      <PageHeader title="My Account" subtitle="Update your profile and appearance settings." />
      <AccountForm user={{ name: me.name, email: me.email, role: me.role }} />
    </div>
  );
}
