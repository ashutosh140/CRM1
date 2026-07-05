import { prisma } from "./prisma";
import type { Role } from "@prisma/client";
import { leadScope, customerScope, invoiceScope, taskScope } from "./scope";

type ScopeUser = { id: string; role: Role };

export async function getDashboardStats(user: ScopeUser) {
  const L = leadScope(user);
  const [
    totalLeads,
    wonLeads,
    lostLeads,
    openLeads,
    customers,
    pendingTasks,
    invoices,
    hotLeads,
  ] = await Promise.all([
    prisma.lead.count({ where: L }),
    prisma.lead.count({ where: { ...L, status: "WON" } }),
    prisma.lead.count({ where: { ...L, status: "LOST" } }),
    prisma.lead.count({ where: { ...L, status: { notIn: ["WON", "LOST"] } } }),
    prisma.customer.count({ where: customerScope(user) }),
    prisma.task.count({ where: { ...taskScope(user), status: { not: "DONE" } } }),
    prisma.invoice.findMany({ where: invoiceScope(user), select: { total: true, paidAmount: true, status: true } }),
    prisma.lead.findMany({
      where: { ...L, status: { notIn: ["WON", "LOST"] } },
      orderBy: { score: "desc" },
      take: 5,
      include: { owner: { select: { name: true } } },
    }),
  ]);

  const revenue = invoices.reduce((s, i) => s + i.paidAmount, 0);
  const outstanding = invoices.reduce((s, i) => s + (i.total - i.paidAmount), 0);
  const closedTotal = wonLeads + lostLeads;
  const winRate = closedTotal > 0 ? Math.round((wonLeads / closedTotal) * 100) : 0;

  // pipeline funnel by status
  const statusGroups = await prisma.lead.groupBy({
    by: ["status"],
    where: L,
    _count: { _all: true },
    _sum: { estimatedValue: true },
  });

  const pipelineValue = statusGroups
    .filter((g) => !["WON", "LOST"].includes(g.status))
    .reduce((s, g) => s + (g._sum.estimatedValue ?? 0), 0);

  return {
    totalLeads,
    wonLeads,
    lostLeads,
    openLeads,
    customers,
    pendingTasks,
    revenue,
    outstanding,
    winRate,
    pipelineValue,
    hotLeads,
    statusGroups,
  };
}

export async function getMonthlyRevenue(user: ScopeUser) {
  // group invoices by created month (last 6 months) — predictive dashboard input
  const invoices = await prisma.invoice.findMany({
    where: invoiceScope(user),
    select: { paidAmount: true, total: true, createdAt: true },
  });
  const buckets = new Map<string, { revenue: number; billed: number }>();
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleString("en-IN", { month: "short" });
    buckets.set(key, { revenue: 0, billed: 0 });
  }
  for (const inv of invoices) {
    const key = new Date(inv.createdAt).toLocaleString("en-IN", { month: "short" });
    const b = buckets.get(key);
    if (b) {
      b.revenue += inv.paidAmount;
      b.billed += inv.total;
    }
  }
  return Array.from(buckets.entries()).map(([month, v]) => ({ month, ...v }));
}
