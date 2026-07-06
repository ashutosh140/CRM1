"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { sendEmail, emailTemplate } from "@/lib/email";
import { formatDateTime } from "@/lib/utils";

/** Schedule a video meeting (Google Meet link) and optionally email invites. */
export async function scheduleMeetingAction(_prev: unknown, formData: FormData) {
  const me = await getCurrentUser();
  if (!me) return { error: "Not authenticated" };

  const title = String(formData.get("title") || "").trim();
  if (!title) return { error: "Meeting title is required." };

  let link = String(formData.get("link") || "").trim();
  if (!link) link = "https://meet.google.com/new"; // opens a fresh Google Meet
  if (!/^https?:\/\//i.test(link)) link = `https://${link}`;

  const whenRaw = String(formData.get("scheduledAt") || "").trim();
  const scheduledAt = whenRaw ? new Date(whenRaw) : null;
  const attendees = String(formData.get("attendees") || "").trim() || null;

  await prisma.videoMeeting.create({
    data: { title, link, scheduledAt, attendees, createdById: me.id },
  });

  // email invites (best-effort)
  let invited = 0;
  if (attendees) {
    const emails = attendees.split(/[,\s]+/).map((e) => e.trim()).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    for (const to of emails) {
      const res = await sendEmail({
        to,
        subject: `Meeting invite: ${title}`,
        html: emailTemplate({
          title: `You're invited: ${title}`,
          body: `${me.name} has invited you to a video meeting.<br/><br/>` +
            (scheduledAt ? `<b>When:</b> ${formatDateTime(scheduledAt)}<br/>` : "") +
            `<b>Join with Google Meet:</b> ${link}`,
          cta: { label: "Join Google Meet", url: link },
        }),
      });
      if (res.ok) invited++;
    }
  }

  revalidatePath("/meetings");
  return { ok: true, invited };
}

/** Edit a scheduled meeting (title, time, link, attendees) and optionally re-send invites. */
export async function updateMeetingAction(_prev: unknown, formData: FormData) {
  const me = await getCurrentUser();
  if (!me) return { error: "Not authenticated" };

  const id = String(formData.get("id") || "");
  const m = await prisma.videoMeeting.findUnique({ where: { id } });
  if (!m) return { error: "Meeting not found." };
  if (m.createdById !== me.id && !hasRole(me.role, "ADMIN")) return { error: "You can't edit this meeting." };

  const title = String(formData.get("title") || "").trim();
  if (!title) return { error: "Meeting title is required." };

  let link = String(formData.get("link") || "").trim();
  if (!link) link = "https://meet.google.com/new";
  if (!/^https?:\/\//i.test(link)) link = `https://${link}`;

  const whenRaw = String(formData.get("scheduledAt") || "").trim();
  const scheduledAt = whenRaw ? new Date(whenRaw) : null;
  const attendees = String(formData.get("attendees") || "").trim() || null;
  const resend = formData.get("resend") === "on";

  await prisma.videoMeeting.update({
    where: { id },
    data: { title, link, scheduledAt, attendees },
  });

  let invited = 0;
  if (resend && attendees) {
    const emails = attendees.split(/[,\s]+/).map((e) => e.trim()).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    for (const to of emails) {
      const res = await sendEmail({
        to,
        subject: `Updated meeting: ${title}`,
        html: emailTemplate({
          title: `Meeting updated: ${title}`,
          body: `${me.name} updated a video meeting.<br/><br/>` +
            (scheduledAt ? `<b>When:</b> ${formatDateTime(scheduledAt)}<br/>` : "") +
            `<b>Join with Google Meet:</b> ${link}`,
          cta: { label: "Join Google Meet", url: link },
        }),
      });
      if (res.ok) invited++;
    }
  }

  revalidatePath("/meetings");
  return { ok: true, invited };
}

export async function deleteMeetingAction(id: string) {
  const me = await getCurrentUser();
  if (!me) return;
  const m = await prisma.videoMeeting.findUnique({ where: { id } });
  if (!m) return;
  if (m.createdById !== me.id && !hasRole(me.role, "ADMIN")) return;
  await prisma.videoMeeting.delete({ where: { id } });
  revalidatePath("/meetings");
}
