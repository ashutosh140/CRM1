import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardStats } from "@/lib/queries";
import { leadScope, customerScope, invoiceScope, taskScope } from "@/lib/scope";
import { askAssistant } from "@/lib/ai";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** POST /api/ai/assistant { question } — answers from the user's (role-scoped) CRM data. */
export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const { question } = await req.json().catch(() => ({ question: "" }));
  if (!question || typeof question !== "string") return NextResponse.json({ error: "No question" }, { status: 400 });

  const [stats, overdue, recentCustomers, myOpenTasks] = await Promise.all([
    getDashboardStats(me),
    prisma.invoice.count({ where: { ...invoiceScope(me), dueDate: { lt: new Date() }, status: { not: "PAID" } } }),
    prisma.customer.findMany({ where: customerScope(me), orderBy: { createdAt: "desc" }, take: 5, select: { name: true, company: true, lifetimeValue: true } }),
    prisma.task.count({ where: { ...taskScope(me), status: { not: "DONE" } } }),
  ]);

  const funnel = stats.statusGroups.map((g) => `${g.status}:${g._count._all}`).join(", ");
  const hot = stats.hotLeads.map((l, i) => `${i + 1}) ${l.name}${l.company ? ` (${l.company})` : ""} — ${l.status} — ${formatCurrency(l.estimatedValue)} — owner ${l.owner?.name ?? "Unassigned"}`).join("\n");
  const custs = recentCustomers.map((c) => `- ${c.name}${c.company ? ` (${c.company})` : ""} — LTV ${formatCurrency(c.lifetimeValue)}`).join("\n");

  const scopeNote = leadScope(me).ownerId ? "(This snapshot is limited to the data YOU own.)" : "(This snapshot covers the whole organisation.)";

  const context = [
    `Viewer: ${me.name} (${me.role}). ${scopeNote}`,
    `Leads: ${stats.totalLeads} total — open ${stats.openLeads}, won ${stats.wonLeads}, lost ${stats.lostLeads}. Win rate: ${stats.winRate}%.`,
    `Customers: ${stats.customers}. Pipeline value: ${formatCurrency(stats.pipelineValue)}.`,
    `Revenue collected: ${formatCurrency(stats.revenue)}. Outstanding: ${formatCurrency(stats.outstanding)}. Overdue invoices: ${overdue}.`,
    `Open/pending tasks: ${myOpenTasks}.`,
    `Pipeline by status: ${funnel || "none"}.`,
    `Top hot leads:\n${hot || "none"}`,
    `Recent customers:\n${custs || "none"}`,
  ].join("\n");

  const { answer, mocked } = await askAssistant(question, context);
  return NextResponse.json({ answer, mocked }, { headers: { "Cache-Control": "no-store" } });
}
