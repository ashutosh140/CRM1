"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function createNoteAction() {
  const me = await getCurrentUser();
  if (!me) return { error: "Not authenticated" };
  const note = await prisma.note.create({
    data: { userId: me.id, title: "Untitled note", body: "" },
  });
  revalidatePath("/notes");
  return { ok: true, id: note.id };
}

export async function updateNoteAction(id: string, title: string, body: string) {
  const me = await getCurrentUser();
  if (!me) return { error: "Not authenticated" };
  await prisma.note.updateMany({
    where: { id, userId: me.id },
    data: { title: title.trim() || "Untitled note", body },
  });
  revalidatePath("/notes");
  return { ok: true };
}

export async function deleteNoteAction(id: string) {
  const me = await getCurrentUser();
  if (!me) return;
  await prisma.note.deleteMany({ where: { id, userId: me.id } });
  revalidatePath("/notes");
}

export async function setNoteColorAction(id: string, color: string) {
  const me = await getCurrentUser();
  if (!me) return;
  await prisma.note.updateMany({ where: { id, userId: me.id }, data: { color: color || null } });
  revalidatePath("/notes");
}

export async function togglePinAction(id: string) {
  const me = await getCurrentUser();
  if (!me) return;
  const note = await prisma.note.findFirst({ where: { id, userId: me.id } });
  if (!note) return;
  await prisma.note.update({ where: { id }, data: { pinned: !note.pinned } });
  revalidatePath("/notes");
}
