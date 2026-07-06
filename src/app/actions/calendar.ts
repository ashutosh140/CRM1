"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function createEventAction(_prev: unknown, formData: FormData) {
  const me = await getCurrentUser();
  if (!me) return { error: "Not authenticated" };

  const title = String(formData.get("title") || "").trim();
  const dateStr = String(formData.get("date") || "").trim();
  const time = String(formData.get("time") || "").trim();
  const notes = String(formData.get("notes") || "").trim() || null;
  const color = String(formData.get("color") || "").trim() || null;

  if (!title) return { error: "Title is required." };
  if (!dateStr) return { error: "Please pick a date." };

  const date = new Date(time ? `${dateStr}T${time}` : `${dateStr}T09:00`);
  if (isNaN(date.getTime())) return { error: "Invalid date." };

  await prisma.calendarEvent.create({
    data: { userId: me.id, title, date, allDay: !time, notes, color },
  });
  revalidatePath("/calendar");
  return { ok: true };
}

export async function deleteEventAction(id: string) {
  const me = await getCurrentUser();
  if (!me) return;
  await prisma.calendarEvent.deleteMany({ where: { id, userId: me.id } });
  revalidatePath("/calendar");
}
