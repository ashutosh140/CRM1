"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { summarizeMeeting } from "@/lib/ai";

export async function createMeetingAction(_prev: unknown, formData: FormData) {
  const title = String(formData.get("title") || "Untitled meeting").trim();
  const transcript = String(formData.get("transcript") || "").trim();
  if (!transcript) return { error: "Transcript ya notes paste karo." };

  const { data: s, mocked } = await summarizeMeeting(transcript);
  const user = await getCurrentUser();

  await prisma.meeting.create({
    data: {
      title,
      transcript,
      summary: s.summary,
      actionItems: s.actionItems,
      nextMeeting: s.nextMeeting,
    },
  });

  // Auto-create tasks from the meeting
  for (const t of s.tasks.slice(0, 8)) {
    await prisma.task.create({
      data: { title: t.title, creatorId: user?.id, assigneeId: user?.id, priority: "MEDIUM" },
    });
  }

  revalidatePath("/meetings");
  revalidatePath("/tasks");
  return { ok: true, mocked, summary: s.summary, actionItems: s.actionItems, taskCount: s.tasks.length };
}
