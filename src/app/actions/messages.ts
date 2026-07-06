"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { notify, notifyMany } from "@/lib/notify";

const MAX_FILE = 10 * 1024 * 1024; // 10 MB

/** Send a message to a user (targetType=user) or a group (targetType=group). */
export async function sendMessageAction(formData: FormData) {
  const me = await getCurrentUser();
  if (!me) return { error: "Not authenticated" };

  const targetType = String(formData.get("targetType") || "user");
  const targetId = String(formData.get("targetId") || "");
  const body = String(formData.get("body") || "").trim();
  if (!targetId) return { error: "No recipient" };

  let fileName: string | null = null;
  let fileType: string | null = null;
  let fileData: string | null = null;

  const file = formData.get("file");
  if (file && typeof file === "object" && "arrayBuffer" in file && file.size > 0) {
    if (file.size > MAX_FILE) return { error: "File is too large. The maximum allowed size is 20 MB." };
    const buf = Buffer.from(await file.arrayBuffer());
    fileType = file.type || "application/octet-stream";
    fileName = file.name || "file";
    fileData = `data:${fileType};base64,${buf.toString("base64")}`;
  }

  if (!body && !fileData) return { error: "Message is empty." };

  const preview = body ? body.slice(0, 80) : "Sent a file 📎";
  if (targetType === "group") {
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: targetId, userId: me.id } },
    });
    if (!member && !hasRole(me.role, "ADMIN")) return { error: "Not a group member." };
    await prisma.message.create({
      data: { senderId: me.id, groupId: targetId, body: body || null, fileName, fileType, fileData },
    });
    const group = await prisma.group.findUnique({
      where: { id: targetId },
      include: { members: { select: { userId: true } } },
    });
    await notifyMany(
      (group?.members ?? []).map((m) => m.userId).filter((uid) => uid !== me.id),
      `${me.name} in ${group?.name ?? "a group"}`, preview, "/communication"
    );
  } else {
    await prisma.message.create({
      data: { senderId: me.id, recipientId: targetId, body: body || null, fileName, fileType, fileData },
    });
    await notify(targetId, `New message from ${me.name}`, preview, "/communication");
  }
  return { ok: true };
}

/** Create a group with the given members (creator is always added). */
export async function createGroupAction(formData: FormData) {
  const me = await getCurrentUser();
  if (!me) return { error: "Not authenticated" };

  const name = String(formData.get("name") || "").trim();
  const memberIds = formData.getAll("memberIds").map(String).filter(Boolean);
  if (!name) return { error: "Group name is required." };
  if (memberIds.length === 0) return { error: "Select at least one member." };

  const ids = Array.from(new Set([me.id, ...memberIds]));
  const group = await prisma.group.create({
    data: {
      name,
      createdById: me.id,
      members: { create: ids.map((userId) => ({ userId })) },
    },
  });
  return { ok: true, groupId: group.id };
}
