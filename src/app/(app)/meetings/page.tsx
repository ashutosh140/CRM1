import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { MeetingForm } from "@/components/MeetingForm";
import { formatDate } from "@/lib/utils";

export default async function MeetingsPage() {
  const meetings = await prisma.meeting.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <div>
      <PageHeader
        title="Meeting Summaries"
        subtitle="Paste a transcript → AI generates summary, action items & auto-creates tasks."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MeetingForm />
        <div className="space-y-4">
          {meetings.length === 0 ? (
            <EmptyState message="No meetings yet. Generate your first summary." />
          ) : (
            meetings.map((m) => (
              <Card key={m.id}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">{m.title}</h3>
                  <span className="text-xs text-slate-400">{formatDate(m.createdAt)}</span>
                </div>
                {m.summary && <p className="mt-2 text-sm text-slate-600">{m.summary}</p>}
                {Array.isArray(m.actionItems) && (m.actionItems as string[]).length > 0 && (
                  <ul className="mt-2 list-inside list-disc text-sm text-slate-500">
                    {(m.actionItems as string[]).map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                )}
                {m.nextMeeting && <p className="mt-2 text-xs text-brand-600">Next: {m.nextMeeting}</p>}
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
