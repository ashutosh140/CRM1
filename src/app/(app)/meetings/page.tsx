import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { MeetingForm } from "@/components/MeetingForm";
import { VideoMeetings } from "@/components/VideoMeetings";
import { formatDate } from "@/lib/utils";

export default async function MeetingsPage() {
  const [meetings, videoMeetings] = await Promise.all([
    prisma.meeting.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.videoMeeting.findMany({ orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }], take: 30 }),
  ]);

  return (
    <div>
      <PageHeader
        title="Meetings"
        subtitle="Start or schedule Google Meet video calls, and turn transcripts into AI summaries."
      />

      <div className="mb-6">
        <VideoMeetings meetings={videoMeetings.map((m) => ({
          id: m.id, title: m.title, link: m.link,
          scheduledAt: m.scheduledAt ? m.scheduledAt.toISOString() : null, attendees: m.attendees,
        }))} />
      </div>

      <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">AI Meeting Summaries</h2>
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
