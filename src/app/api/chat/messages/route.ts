import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** GET /api/chat/messages?target=user:<id>|group:<id> — fresh conversation feed. */
export async function GET(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const target = new URL(req.url).searchParams.get("target") || "";
  const [type, id] = target.split(":");
  if (!id) return NextResponse.json({ meId: me.id, messages: [] });

  let where: object;
  if (type === "group") {
    // access: member OR admin
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId: me.id } },
    });
    if (!member && !hasRole(me.role, "ADMIN")) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    where = { groupId: id };
  } else {
    where = {
      OR: [
        { senderId: me.id, recipientId: id },
        { senderId: id, recipientId: me.id },
      ],
    };
    // mark their DMs to me as read
    await prisma.message.updateMany({
      where: { senderId: id, recipientId: me.id, readAt: null },
      data: { readAt: new Date() },
    });
  }

  const rows = await prisma.message.findMany({
    where,
    orderBy: { createdAt: "asc" },
    take: 300,
    // NOTE: never select `fileData` here — it's the full file blob. The chat polls
    // this endpoint every ~2s, so pulling every attachment's bytes each time is huge.
    // The actual file is streamed on demand from /api/messages/[id]/file instead.
    select: {
      id: true, senderId: true, body: true, fileName: true, fileType: true,
      createdAt: true, sender: { select: { name: true } },
    },
  });

  return NextResponse.json({
    meId: me.id,
    messages: rows.map((m) => ({
      id: m.id, senderId: m.senderId, senderName: m.sender.name,
      body: m.body, fileName: m.fileName, fileType: m.fileType,
      hasFile: Boolean(m.fileName), createdAt: m.createdAt.toISOString(),
    })),
  }, { headers: { "Cache-Control": "no-store" } });
}
