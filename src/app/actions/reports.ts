"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { generateClientReport } from "@/lib/ai";
import { generateReportPdf } from "@/lib/pdf";
import { sendEmail, emailTemplate } from "@/lib/email";
import { formatDate } from "@/lib/utils";

/** Generate a clean PDF (base64) from the current report title + content. */
export async function reportPdfAction(title: string, content: string) {
  const base64 = await generateReportPdf(title || "Client Report", content || "");
  return { base64 };
}

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
      clientInfo: { orderBy: { createdAt: "desc" }, take: 50 },
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
    clientInfo: customer.clientInfo.map((k) => ({
      kind: k.kind, title: k.title, text: k.body || k.fileName,
    })),
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

/** Light markdown → HTML for emailing a report. */
function mdToHtml(md: string): string {
  return md.split("\n").map((line) => {
    const t = line.trim();
    if (t.startsWith("## ")) return `<h3 style="margin:14px 0 4px">${t.slice(3)}</h3>`;
    if (t.startsWith("# ")) return `<h2 style="margin:16px 0 6px">${t.slice(2)}</h2>`;
    if (t.startsWith("- ")) return `<li>${t.slice(2)}</li>`;
    if (t === "") return "<br/>";
    return `<p style="margin:4px 0">${t.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")}</p>`;
  }).join("");
}

/** Email a (possibly edited) report to the client. */
export async function sendReportEmailAction(reportId: string, title: string, content: string) {
  const me = await getCurrentUser();
  if (!me) return { error: "Not authenticated" };
  const report = await prisma.clientReport.findUnique({
    where: { id: reportId }, include: { customer: true },
  });
  if (!report) return { error: "Report not found" };
  if (!report.customer.email) return { error: "This client has no email address." };

  // persist any edits first
  await prisma.clientReport.update({ where: { id: reportId }, data: { title, content } });

  const res = await sendEmail({
    to: report.customer.email, toName: report.customer.name,
    subject: title || `Report for ${report.customer.name}`,
    html: emailTemplate({ title: title || "Your Report", body: mdToHtml(content) }),
  });

  // log this send in the report history
  await prisma.reportSend.create({
    data: { reportId: report.id, sentById: me.id, sentTo: report.customer.email },
  });

  await prisma.activity.create({
    data: {
      channel: "EMAIL", direction: "OUTBOUND", customerId: report.customerId,
      subject: title, content: res.mocked ? `[MOCK] Report emailed to ${report.customer.email}` : `Report "${title}" emailed to ${report.customer.email}`,
    },
  });
  revalidatePath(`/customers/${report.customerId}`);
  return { ok: res.ok, mocked: res.mocked, error: res.ok ? undefined : (res.error || "Send failed") };
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
