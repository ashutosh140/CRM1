import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { digitalTwin } from "@/lib/ai";

export const dynamic = "force-dynamic";

/** Compute the Digital Twin call-prep for a customer (client-side loaded so the page never blocks on AI). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    select: {
      name: true, company: true, healthScore: true, lifetimeValue: true,
      activities: { orderBy: { createdAt: "desc" }, take: 5, select: { content: true } },
    },
  });
  if (!customer) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { data } = await digitalTwin({
    name: customer.name, company: customer.company,
    healthScore: customer.healthScore, lifetimeValue: customer.lifetimeValue,
    recentActivity: customer.activities.map((a) => a.content),
  });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
