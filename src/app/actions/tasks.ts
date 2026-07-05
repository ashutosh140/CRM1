"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { notify } from "@/lib/notify";
import type { TaskPriority } from "@prisma/client";

function genTaskCode() {
  return "TK-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

/** Assign a new task/ticket to someone. */
export async function createTaskAction(_prev: unknown, formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  if (!title) return { error: "Title is required." };
  const me = await getCurrentUser();
  if (!me) return { error: "Not authenticated" };

  const assigneeId = String(formData.get("assigneeId") || "") || me.id;
  const task = await prisma.task.create({
    data: {
      code: genTaskCode(),
      title,
      description: String(formData.get("description") || "") || null,
      priority: (String(formData.get("priority") || "MEDIUM")) as TaskPriority,
      assigneeId,
      creatorId: me.id,
      status: "ASSIGNED",
      dueDate: formData.get("dueDate") ? new Date(String(formData.get("dueDate"))) : null,
    },
  });
  if (assigneeId !== me.id) {
    await notify(assigneeId, `New task from ${me.name}`, title, `/tasks/${task.id}`);
  }
  revalidatePath("/tasks");
  return { ok: true };
}

/** Assignee opens the ticket → mark as seen (read receipt for the assigner). */
export async function markSeenAction(taskId: string) {
  const me = await getCurrentUser();
  if (!me) return;
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.assigneeId !== me.id) return;
  if (task.status === "ASSIGNED") {
    await prisma.task.update({
      where: { id: taskId },
      data: { status: "SEEN", seenAt: task.seenAt ?? new Date() },
    });
    revalidatePath("/tasks");
    revalidatePath(`/tasks/${taskId}`);
  }
}

/** Post a message in the ticket conversation. */
export async function postTaskMessageAction(_prev: unknown, formData: FormData) {
  const me = await getCurrentUser();
  if (!me) return { error: "Not authenticated" };
  const taskId = String(formData.get("taskId") || "");
  const body = String(formData.get("body") || "").trim();
  if (!taskId || !body) return { error: "Message is empty." };
  await prisma.taskMessage.create({ data: { taskId, senderId: me.id, body, kind: "MESSAGE" } });
  revalidatePath(`/tasks/${taskId}`);
  return { ok: true };
}

/** Assignee submits completion with a note → status COMPLETED (awaiting verification). */
export async function submitCompletionAction(_prev: unknown, formData: FormData) {
  const me = await getCurrentUser();
  if (!me) return { error: "Not authenticated" };
  const taskId = String(formData.get("taskId") || "");
  const note = String(formData.get("note") || "").trim();
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.assigneeId !== me.id) return { error: "Only the assignee can complete this." };
  if (!note) return { error: "Please describe what you completed." };

  await prisma.$transaction([
    prisma.taskMessage.create({ data: { taskId, senderId: me.id, body: note, kind: "COMPLETION" } }),
    prisma.task.update({ where: { id: taskId }, data: { status: "COMPLETED" } }),
  ]);
  await notify(task.creatorId, `Task completed: ${task.title}`, `${me.name} submitted their work for review`, `/tasks/${taskId}`);
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  return { ok: true };
}

/** Assigner verifies the completed work → status DONE. */
export async function verifyDoneAction(taskId: string) {
  const me = await getCurrentUser();
  if (!me) return { error: "Not authenticated" };
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.creatorId !== me.id) return { error: "Only the assigner can verify." };

  await prisma.$transaction([
    prisma.taskMessage.create({ data: { taskId, senderId: me.id, body: "Verified & marked as done. Great work! ✅", kind: "VERIFIED" } }),
    prisma.task.update({ where: { id: taskId }, data: { status: "DONE" } }),
  ]);
  await notify(task.assigneeId, `Task marked done: ${task.title}`, `${me.name} verified your work ✅`, `/tasks/${taskId}`);
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  return { ok: true };
}

/** Assigner reopens/reassigns the same ticket (same token) with instructions. */
export async function reassignAction(_prev: unknown, formData: FormData) {
  const me = await getCurrentUser();
  if (!me) return { error: "Not authenticated" };
  const taskId = String(formData.get("taskId") || "");
  const instructions = String(formData.get("instructions") || "").trim();
  const newAssigneeId = String(formData.get("assigneeId") || "");
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.creatorId !== me.id) return { error: "Only the assigner can reassign." };
  if (!instructions) return { error: "Add instructions for what to fix / do next." };

  await prisma.$transaction([
    prisma.taskMessage.create({ data: { taskId, senderId: me.id, body: instructions, kind: "REASSIGN" } }),
    prisma.task.update({
      where: { id: taskId },
      data: {
        status: "ASSIGNED",
        seenAt: null,
        assigneeId: newAssigneeId || task.assigneeId,
      },
    }),
  ]);
  await notify(newAssigneeId || task.assigneeId, `Task reassigned: ${task.title}`, instructions, `/tasks/${taskId}`);
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  return { ok: true };
}
