import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardStats } from "@/lib/queries";
import { leadScope, customerScope, invoiceScope, taskScope, quotationScope } from "@/lib/scope";
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

  const now = Date.now();
  const d7 = new Date(now - 7 * 86400000);
  const d30 = new Date(now - 30 * 86400000);
  const fmtD = (d: Date) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

  const [stats, overdue, recentCustomers, myOpenTasks, leads7, leads30, recentLeads, openTasks, recentQuotes, recentInvoices] = await Promise.all([
    getDashboardStats(me),
    prisma.invoice.count({ where: { ...invoiceScope(me), dueDate: { lt: new Date() }, status: { not: "PAID" } } }),
    prisma.customer.findMany({ where: customerScope(me), orderBy: { createdAt: "desc" }, take: 8, select: { name: true, company: true, lifetimeValue: true, phone: true, email: true } }),
    prisma.task.count({ where: { ...taskScope(me), status: { not: "DONE" } } }),
    prisma.lead.count({ where: { ...leadScope(me), createdAt: { gte: d7 } } }),
    prisma.lead.count({ where: { ...leadScope(me), createdAt: { gte: d30 } } }),
    prisma.lead.findMany({ where: leadScope(me), orderBy: { createdAt: "desc" }, take: 12, select: { name: true, company: true, status: true, estimatedValue: true, createdAt: true, phone: true, owner: { select: { name: true } } } }),
    prisma.task.findMany({ where: { ...taskScope(me), status: { not: "DONE" } }, orderBy: { createdAt: "desc" }, take: 10, select: { title: true, status: true, priority: true, dueDate: true, assignee: { select: { name: true } } } }),
    prisma.quotation.findMany({ where: quotationScope(me), orderBy: { createdAt: "desc" }, take: 6, select: { number: true, total: true, status: true, customer: { select: { name: true } } } }),
    prisma.invoice.findMany({ where: invoiceScope(me), orderBy: { createdAt: "desc" }, take: 6, select: { number: true, total: true, paidAmount: true, status: true, dueDate: true, customer: { select: { name: true } } } }),
  ]);

  const funnel = stats.statusGroups.map((g) => `${g.status}:${g._count._all}`).join(", ");
  const hot = stats.hotLeads.map((l, i) => `${i + 1}) ${l.name}${l.company ? ` (${l.company})` : ""} — ${l.status} — ${formatCurrency(l.estimatedValue)} — owner ${l.owner?.name ?? "Unassigned"}`).join("\n");
  const custs = recentCustomers.map((c) => `- ${c.name}${c.company ? ` (${c.company})` : ""} — LTV ${formatCurrency(c.lifetimeValue)}${c.phone ? ` — ${c.phone}` : ""}`).join("\n");
  const leadList = recentLeads.map((l) => `- ${l.name}${l.company ? ` (${l.company})` : ""} — ${l.status} — ${formatCurrency(l.estimatedValue)} — added ${fmtD(l.createdAt)} — owner ${l.owner?.name ?? "Unassigned"}`).join("\n");
  const taskList = openTasks.map((t) => `- ${t.title} — ${t.status}/${t.priority}${t.dueDate ? ` — due ${fmtD(t.dueDate)}` : ""} — ${t.assignee?.name ?? "Unassigned"}`).join("\n");
  const quoteList = recentQuotes.map((qx) => `- ${qx.number} — ${qx.customer.name} — ${formatCurrency(qx.total)} — ${qx.status}`).join("\n");
  const invList = recentInvoices.map((iv) => `- ${iv.number} — ${iv.customer.name} — ${formatCurrency(iv.total)} (paid ${formatCurrency(iv.paidAmount)}) — ${iv.status}${iv.dueDate ? ` — due ${fmtD(iv.dueDate)}` : ""}`).join("\n");

  const scopeNote = leadScope(me).ownerId ? "(This snapshot is limited to the data YOU own.)" : "(This snapshot covers the whole organisation.)";

  const context = [
    `Today: ${fmtD(new Date())}. Viewer: ${me.name} (${me.role}). ${scopeNote}`,
    `Leads: ${stats.totalLeads} total — open ${stats.openLeads}, won ${stats.wonLeads}, lost ${stats.lostLeads}. Win rate: ${stats.winRate}%.`,
    `New leads in last 7 days: ${leads7}. Last 30 days: ${leads30}.`,
    `Customers: ${stats.customers}. Pipeline value: ${formatCurrency(stats.pipelineValue)}.`,
    `Revenue collected: ${formatCurrency(stats.revenue)}. Outstanding: ${formatCurrency(stats.outstanding)}. Overdue invoices: ${overdue}.`,
    `Open/pending tasks: ${myOpenTasks}.`,
    `Pipeline by status: ${funnel || "none"}.`,
    `Top hot leads:\n${hot || "none"}`,
    `Recent leads (newest first, with dates):\n${leadList || "none"}`,
    `Recent customers:\n${custs || "none"}`,
    `Open tasks:\n${taskList || "none"}`,
    `Recent quotations:\n${quoteList || "none"}`,
    `Recent invoices:\n${invList || "none"}`,
  ].join("\n");

  const { answer, mocked } = await askAssistant(question, context);
  return NextResponse.json({ answer, mocked }, { headers: { "Cache-Control": "no-store" } });
}
