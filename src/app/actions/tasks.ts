"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import type { TaskStatus, TaskPriority } from "@prisma/client";

export async function createTaskAction(_prev: unknown, formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  if (!title) return { error: "Title is required." };
  const user = await getCurrentUser();

  await prisma.task.create({
    data: {
      title,
      description: String(formData.get("description") || "") || null,
      priority: (String(formData.get("priority") || "MEDIUM")) as TaskPriority,
      assigneeId: String(formData.get("assigneeId") || "") || user?.id || null,
      creatorId: user?.id,
      dueDate: formData.get("dueDate") ? new Date(String(formData.get("dueDate"))) : null,
    },
  });
  revalidatePath("/tasks");
  return { ok: true };
}

export async function setTaskStatusAction(id: string, status: TaskStatus) {
  await prisma.task.update({ where: { id }, data: { status } });
  revalidatePath("/tasks");
}
