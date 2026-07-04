"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { generateClientReport } from "@/lib/ai";
import { formatDate } from "@/lib/utils";

/** Generate an AI report for a client based on a custom instruction. */
export async function generateClientReportAction(customerId: string, instruction: string) {
  const me = await getCurrentUser();
  if (!me) return { error: "Not authenticated" };

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      activities: { orderBy: { createdAt: "desc" }, take: 30 },
      quotations: { orderBy: { createdAt: "desc" }, take: 10 },
      invoices: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!customer) return { error: "Customer not found" };

  const { data, mocked } = await generateClientReport({
    customer: {
      name: customer.name, company: customer.company, email: customer.email, phone: customer.phone,
      healthScore: customer.healthScore, lifetimeValue: customer.lifetimeValue, tags: customer.tags,
    },
    activities: customer.activities.map((a) => ({
      channel: a.channel, direction: a.direction, content: a.content,
      sentiment: a.sentiment, date: formatDate(a.createdAt),
    })),
    quotations: customer.quotations.map((q) => ({ number: q.number, status: q.status, total: q.total })),
    invoices: customer.invoices.map((i) => ({ number: i.number, status: i.status, total: i.total, paid: i.paidAmount })),
    instruction,
  });

  const report = await prisma.clientReport.create({
    data: {
      title: data.title || `Client Report — ${customer.name}`,
      prompt: instruction || null,
      content: data.content,
      customerId: customer.id,
      createdById: me.id,
    },
  });

  revalidatePath(`/customers/${customerId}`);
  return { ok: true, mocked, report: { id: report.id, title: report.title, content: report.content, createdAt: report.createdAt.toISOString() } };
}

export async function updateReportAction(id: string, content: string, title: string) {
  const me = await getCurrentUser();
  if (!me) return { error: "Not authenticated" };
  await prisma.clientReport.update({ where: { id }, data: { content, title } });
  return { ok: true };
}

export async function deleteReportAction(id: string, customerId: string) {
  const me = await getCurrentUser();
  if (!me) return { error: "Not authenticated" };
  await prisma.clientReport.delete({ where: { id } });
  revalidatePath(`/customers/${customerId}`);
  return { ok: true };
}
