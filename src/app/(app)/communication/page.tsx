import Link from "next/link";
import { MessageSquare, Mail, Phone, MessageCircle, StickyNote } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader, Badge, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/utils";

const ICONS: Record<string, React.ReactNode> = {
  WHATSAPP: <MessageCircle size={16} className="text-emerald-500" />,
  EMAIL: <Mail size={16} className="text-blue-500" />,
  SMS: <MessageSquare size={16} className="text-violet-500" />,
  CALL: <Phone size={16} className="text-amber-500" />,
  NOTE: <StickyNote size={16} className="text-slate-400" />,
};

export default async function CommunicationPage() {
  const activities = await prisma.activity.findMany({
    orderBy: { createdAt: "desc" },
    take: 80,
    include: {
      lead: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true } },
      user: { select: { name: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Communication Center"
        subtitle="Unified WhatsApp, Email, SMS & call log. Connect API keys to send directly from here."
      />

      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
        📌 Outbound sending (WhatsApp / Email / SMS) activates once you add the API keys in <code>.env</code>. Inbound capture & logging work now.
      </div>

      {activities.length === 0 ? (
        <EmptyState message="No communication logged yet. Capture a lead or log an activity." />
      ) : (
        <div className="card divide-y divide-slate-100">
          {activities.map((a) => {
            const who = a.lead ?? a.customer;
            const href = a.lead ? `/leads/${a.lead.id}` : a.customer ? `/customers/${a.customer.id}` : "#";
            return (
              <div key={a.id} className="flex gap-3 p-4">
                <div className="mt-0.5">{ICONS[a.channel]}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={href} className="text-sm font-medium text-slate-800 hover:text-brand-600">
                      {who?.name ?? "Unknown"}
                    </Link>
                    <Badge value={a.channel} />
                    <span className="text-xs text-slate-400">{a.direction}</span>
                    {a.sentiment && <Badge value={a.sentiment} />}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{a.content}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatDate(a.createdAt)}{a.user ? ` · ${a.user.name}` : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
