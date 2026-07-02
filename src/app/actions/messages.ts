"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const MAX_FILE = 5 * 1024 * 1024; // 5 MB

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
    if (file.size > MAX_FILE) return { error: "File too large (max 5 MB)." };
    const buf = Buffer.from(await file.arrayBuffer());
    fileType = file.type || "application/octet-stream";
    fileName = file.name || "file";
    fileData = `data:${fileType};base64,${buf.toString("base64")}`;
  }

  if (!body && !fileData) return { error: "Message is empty." };

  if (targetType === "group") {
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: targetId, userId: me.id } },
    });
    if (!member && me.role !== "ADMIN") return { error: "Not a group member." };
    await prisma.message.create({
      data: { senderId: me.id, groupId: targetId, body: body || null, fileName, fileType, fileData },
    });
  } else {
    await prisma.message.create({
      data: { senderId: me.id, recipientId: targetId, body: body || null, fileName, fileType, fileData },
    });
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
