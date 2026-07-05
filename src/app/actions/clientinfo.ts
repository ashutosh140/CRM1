"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import type { ClientInfoKind } from "@prisma/client";

const MAX_FILE = 6 * 1024 * 1024; // 6 MB

/** Save a note, link, or file (image/PDF) against a client. */
export async function addClientInfoAction(_prev: unknown, formData: FormData) {
  const me = await getCurrentUser();
  if (!me) return { error: "Not authenticated" };

  const customerId = String(formData.get("customerId") || "");
  const kind = (String(formData.get("kind") || "NOTE")) as ClientInfoKind;
  const title = String(formData.get("title") || "").trim() || null;
  const body = String(formData.get("body") || "").trim() || null;
  if (!customerId) return { error: "No customer" };

  let fileName: string | null = null;
  let fileType: string | null = null;
  let fileData: string | null = null;

  const file = formData.get("file");
  if (kind === "FILE" && file && typeof file === "object" && "arrayBuffer" in file && file.size > 0) {
    if (file.size > MAX_FILE) return { error: "File too large (max 6 MB)." };
    const buf = Buffer.from(await file.arrayBuffer());
    fileType = file.type || "application/octet-stream";
    fileName = file.name || "file";
    fileData = `data:${fileType};base64,${buf.toString("base64")}`;
  }

  if (kind === "FILE" && !fileData) return { error: "Please choose a file." };
  if (kind !== "FILE" && !body && !title) return { error: "Add some content." };

  const item = await prisma.clientInfo.create({
    data: { customerId, kind, title, body, fileName, fileType, fileData },
    select: { id: true, kind: true, title: true, body: true, fileName: true, fileType: true, createdAt: true },
  });
  revalidatePath(`/customers/${customerId}`);
  return { ok: true, item: { ...item, createdAt: item.createdAt.toISOString() } };
}

export async function deleteClientInfoAction(id: string, customerId: string) {
  const me = await getCurrentUser();
  if (!me) return;
  await prisma.clientInfo.delete({ where: { id } });
  revalidatePath(`/customers/${customerId}`);
}
