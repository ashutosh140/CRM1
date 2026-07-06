"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { genNumber } from "@/lib/utils";
import { generateProposal, dynamicPricing } from "@/lib/ai";
import { sendEmail, emailTemplate } from "@/lib/email";
import { formatCurrency } from "@/lib/utils";
import type { QuotationStatus } from "@prisma/client";

interface QItem { description: string; qty: number; unitPrice: number; }

interface Item {
  description: string;
  qty: number;
  unitPrice: number;
}

function computeTotals(items: Item[], taxRate: number, discount = 0) {
  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const discounted = Math.max(0, subtotal - discount);
  const taxAmount = Math.round((discounted * taxRate) / 100);
  return { subtotal, discount, taxAmount, total: discounted + taxAmount };
}

export async function createQuotationAction(_prev: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const customerId = String(formData.get("customerId") || "");
  if (!customerId) return { error: "Please choose a customer." };

  const descriptions = formData.getAll("itemDescription").map(String);
  const qtys = formData.getAll("itemQty").map((v) => Number(v) || 0);
  const prices = formData.getAll("itemPrice").map((v) => Number(v) || 0);
  const items: Item[] = descriptions
    .map((d, i) => ({ description: d, qty: qtys[i], unitPrice: prices[i] }))
    .filter((it) => it.description.trim() && it.qty > 0);

  if (items.length === 0) return { error: "Add at least one item." };

  const taxRate = Number(formData.get("taxRate") || 18);
  const discountInput = Math.max(0, Number(formData.get("discount") || 0));
  const { subtotal, discount, taxAmount, total } = computeTotals(items, taxRate, discountInput);
  const validRaw = String(formData.get("validUntil") || "").trim();
  const validUntil = validRaw ? new Date(validRaw) : null;

  await prisma.quotation.create({
    data: {
      number: genNumber("QT"),
      customerId,
      items: items as object,
      subtotal, discount, taxRate, taxAmount, total,
      validUntil,
      notes: String(formData.get("notes") || "") || null,
      createdById: user.id,
      status: "DRAFT",
    },
  });

  revalidatePath("/quotations");
  redirect(`/quotations`);
}

export async function setQuotationStatusAction(id: string, status: QuotationStatus) {
  if (!(await getCurrentUser())) return;
  await prisma.quotation.update({ where: { id }, data: { status } });
  revalidatePath("/quotations");
}

/** Convert an accepted quotation into an invoice. */
export async function convertToInvoiceAction(quotationId: string) {
  if (!(await getCurrentUser())) return;
  const q = await prisma.quotation.findUnique({ where: { id: quotationId } });
  if (!q) return;
  const existing = await prisma.invoice.findUnique({ where: { quotationId } });
  if (existing) { redirect("/invoices"); }

  await prisma.invoice.create({
    data: {
      number: genNumber("INV"),
      customerId: q.customerId,
      quotationId: q.id,
      items: q.items as object,
      subtotal: q.subtotal,
      taxAmount: q.taxAmount,
      total: q.total,
      status: "SENT",
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.quotation.update({ where: { id: quotationId }, data: { status: "ACCEPTED" } });
  revalidatePath("/invoices");
  revalidatePath("/quotations");
  redirect("/invoices");
}

/** AI Proposal Generator for a quotation. */
export async function generateProposalAction(quotationId: string) {
  if (!(await getCurrentUser())) return { error: "Not authenticated" };
  const q = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: { customer: true },
  });
  if (!q) return { error: "Quotation not found" };
  const { data, mocked } = await generateProposal({
    customerName: q.customer.name,
    company: q.customer.company,
    items: q.items as unknown as QItem[],
    total: q.total,
    notes: q.notes,
  });
  return { ok: true, mocked, proposal: data };
}

/** Dynamic Pricing Recommendation for a quotation. */
export async function pricingAdviceAction(quotationId: string) {
  if (!(await getCurrentUser())) return { error: "Not authenticated" };
  const q = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: { customer: { select: { healthScore: true } } },
  });
  if (!q) return { error: "Quotation not found" };
  const { data, mocked } = await dynamicPricing({
    listTotal: q.total,
    customerHealth: q.customer.healthScore,
  });
  return { ok: true, mocked, advice: data };
}

/** Email the quotation to the customer (via Brevo). */
export async function emailQuotationAction(quotationId: string) {
  if (!(await getCurrentUser())) return { error: "Not authenticated" };
  const q = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: { customer: true },
  });
  if (!q) return { error: "Quotation not found" };
  if (!q.customer.email) return { error: "Customer has no email address." };

  const items = (q.items as unknown as QItem[])
    .map((i) => `• ${i.description} — ${i.qty} × ${formatCurrency(i.unitPrice)}`)
    .join("\n");
  const html = emailTemplate({
    title: `Your Quotation ${q.number}`,
    body: `Dear ${q.customer.name},\n\nPlease find your quotation below:\n\n${items}\n\nTotal: ${formatCurrency(q.total)} (incl. tax)\n\n${q.notes ?? ""}`,
    cta: { label: "View Quotation", url: `${process.env.APP_URL ?? "http://localhost:3000"}/print/quotation/${q.id}` },
  });

  const res = await sendEmail({
    to: q.customer.email, toName: q.customer.name,
    subject: `Quotation ${q.number} from AI CRM`, html,
  });

  if (res.ok && q.status === "DRAFT") {
    await prisma.quotation.update({ where: { id: q.id }, data: { status: "SENT" } });
  }
  // log communication
  await prisma.activity.create({
    data: {
      channel: "EMAIL", direction: "OUTBOUND", customerId: q.customerId,
      subject: `Quotation ${q.number}`,
      content: res.mocked ? `[MOCK email] Quotation ${q.number} sent to ${q.customer.email}` : `Quotation ${q.number} emailed to ${q.customer.email}`,
    },
  });
  revalidatePath("/quotations");
  return { ok: res.ok, mocked: res.mocked, error: res.error };
}
