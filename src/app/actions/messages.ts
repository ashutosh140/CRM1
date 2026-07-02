"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const MAX_FILE = 5 * 1024 * 1024; // 5 MB

export interface ChatMessage {
  id: string;
  senderId: string;
  body: string | null;
  fileName: string | null;
  fileType: string | null;
  hasFile: boolean;
  createdAt: string;
}

/** Send a 1-on-1 message (optionally with a file) to another user. */
export async function sendMessageAction(formData: FormData) {
  const me = await getCurrentUser();
  if (!me) return { error: "Not authenticated" };

  const recipientId = String(formData.get("recipientId") || "");
  const body = String(formData.get("body") || "").trim();
  if (!recipientId) return { error: "No recipient" };

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

  await prisma.message.create({
    data: { senderId: me.id, recipientId, body: body || null, fileName, fileType, fileData },
  });
  return { ok: true };
}

/** Fetch the conversation between me and another user (light — no file blobs). */
export async function getConversationAction(otherUserId: string): Promise<{
  meId: string;
  messages: ChatMessage[];
}> {
  const me = await getCurrentUser();
  if (!me) return { meId: "", messages: [] };

  const rows = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: me.id, recipientId: otherUserId },
        { senderId: otherUserId, recipientId: me.id },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 300,
    select: {
      id: true, senderId: true, body: true, fileName: true, fileType: true,
      createdAt: true, fileData: true,
    },
  });

  // mark their messages to me as read
  await prisma.message.updateMany({
    where: { senderId: otherUserId, recipientId: me.id, readAt: null },
    data: { readAt: new Date() },
  });

  return {
    meId: me.id,
    messages: rows.map((m) => ({
      id: m.id, senderId: m.senderId, body: m.body,
      fileName: m.fileName, fileType: m.fileType,
      hasFile: Boolean(m.fileData),
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

/** Unread counts per sender, for badges on the contact list. */
export async function getUnreadCountsAction(): Promise<Record<string, number>> {
  const me = await getCurrentUser();
  if (!me) return {};
  const grouped = await prisma.message.groupBy({
    by: ["senderId"],
    where: { recipientId: me.id, readAt: null },
    _count: { _all: true },
  });
  const out: Record<string, number> = {};
  for (const g of grouped) out[g.senderId] = g._count._all;
  return out;
}
