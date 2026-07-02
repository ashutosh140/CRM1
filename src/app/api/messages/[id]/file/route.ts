import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/** Serve a message's shared file — only to the sender or recipient. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser();
  if (!me) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const msg = await prisma.message.findUnique({
    where: { id },
    select: { senderId: true, recipientId: true, groupId: true, fileData: true, fileName: true, fileType: true },
  });
  if (!msg || !msg.fileData) return new NextResponse("Not found", { status: 404 });

  let allowed = msg.senderId === me.id || msg.recipientId === me.id;
  if (!allowed && msg.groupId) {
    if (me.role === "ADMIN") allowed = true;
    else {
      const member = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: msg.groupId, userId: me.id } },
      });
      allowed = Boolean(member);
    }
  }
  if (!allowed) return new NextResponse("Forbidden", { status: 403 });

  // fileData is a data URL: data:<type>;base64,<payload>
  const base64 = msg.fileData.split(",")[1] ?? "";
  const buffer = Buffer.from(base64, "base64");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": msg.fileType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${(msg.fileName || "file").replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
