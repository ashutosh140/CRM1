import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { aiEnabled } from "@/lib/ai";
import { PageHeader, Card } from "@/components/ui";
import { UserManager } from "@/components/UserManager";

export default async function SettingsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "ADMIN") {
    return (
      <div>
        <PageHeader title="Settings" />
        <Card><p className="text-sm text-slate-500">Only an Admin can access this page.</p></Card>
      </div>
    );
  }

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  const integrations = [
    { name: "OpenAI", env: "OPENAI_API_KEY", on: aiEnabled },
    { name: "WhatsApp Business API", env: "WHATSAPP_API_TOKEN", on: !!process.env.WHATSAPP_API_TOKEN },
    { name: "Email (SMTP)", env: "SMTP_HOST", on: !!process.env.SMTP_HOST },
    { name: "Razorpay", env: "RAZORPAY_KEY_ID", on: !!process.env.RAZORPAY_KEY_ID },
  ];

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage users, roles and integrations." />

      <Card className="mb-6">
        <h2 className="mb-3 font-semibold text-slate-900">Integrations</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {integrations.map((it) => (
            <div key={it.name} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">{it.name}</p>
                <span className={`h-2.5 w-2.5 rounded-full ${it.on ? "bg-emerald-500" : "bg-slate-300"}`} />
              </div>
              <p className="mt-1 text-xs text-slate-400">{it.on ? "Connected" : "Add " + it.env}</p>
            </div>
          ))}
        </div>
      </Card>

      <UserManager
        users={users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, isActive: u.isActive }))}
        meId={me.id}
      />
    </div>
  );
}
