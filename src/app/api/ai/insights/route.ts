import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { businessInsights } from "@/lib/ai";

export const dynamic = "force-dynamic";

/** POST metrics → returns AI business insights (called client-side so the
 *  dashboard renders instantly and never blocks on OpenAI). */
export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const metrics = await req.json().catch(() => ({}));
  const { data, mocked } = await businessInsights(metrics);
  return NextResponse.json({ insights: data.insights, mocked }, { headers: { "Cache-Control": "no-store" } });
}
