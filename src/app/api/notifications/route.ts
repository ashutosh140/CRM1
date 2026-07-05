import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** GET — latest notifications + unread count. */
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ unread: 0, items: [] }, { status: 401 });

  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.notification.count({ where: { userId: me.id, read: false } }),
  ]);

  return NextResponse.json({
    unread,
    items: items.map((n) => ({
      id: n.id, title: n.title, body: n.body, link: n.link, read: n.read, createdAt: n.createdAt.toISOString(),
    })),
  }, { headers: { "Cache-Control": "no-store" } });
}

/** POST — mark one (body.id) or all notifications as read. */
export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const { id } = await req.json().catch(() => ({}));
  await prisma.notification.updateMany({
    where: { userId: me.id, ...(id ? { id } : {}) },
    data: { read: true },
  });
  return NextResponse.json({ ok: true });
}
