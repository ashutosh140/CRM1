import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** GET /api/chat/unread — total unread direct messages for the sidebar badge. */
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ count: 0 });
  const count = await prisma.message.count({
    where: { recipientId: me.id, readAt: null },
  });
  return NextResponse.json({ count }, { headers: { "Cache-Control": "no-store" } });
}
