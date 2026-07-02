import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** GET /api/chat/sidebar — contacts (with unread) + groups the user can see. */
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const [contacts, unread, groups] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true, id: { not: me.id } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true },
    }),
    prisma.message.groupBy({
      by: ["senderId"],
      where: { recipientId: me.id, readAt: null },
      _count: { _all: true },
    }),
    // admin sees ALL groups; others see groups they belong to
    me.role === "ADMIN"
      ? prisma.group.findMany({
          orderBy: { createdAt: "desc" },
          select: { id: true, name: true, _count: { select: { members: true } } },
        })
      : prisma.group.findMany({
          where: { members: { some: { userId: me.id } } },
          orderBy: { createdAt: "desc" },
          select: { id: true, name: true, _count: { select: { members: true } } },
        }),
  ]);

  const unreadMap: Record<string, number> = {};
  for (const u of unread) unreadMap[u.senderId] = u._count._all;

  return NextResponse.json({
    contacts: contacts.map((c) => ({ ...c, unread: unreadMap[c.id] || 0 })),
    groups: groups.map((g) => ({ id: g.id, name: g.name, members: g._count.members })),
  }, { headers: { "Cache-Control": "no-store" } });
}
