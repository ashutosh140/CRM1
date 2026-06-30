"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { genNumber } from "@/lib/utils";
import type { QuotationStatus } from "@prisma/client";

interface Item {
  description: string;
  qty: number;
  unitPrice: number;
}

function computeTotals(items: Item[], taxRate: number) {
  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const taxAmount = Math.round((subtotal * taxRate) / 100);
  return { subtotal, taxAmount, total: subtotal + taxAmount };
}

export async function createQuotationAction(_prev: unknown, formData: FormData) {
  const customerId = String(formData.get("customerId") || "");
  if (!customerId) return { error: "Customer choose karo." };

  const descriptions = formData.getAll("itemDescription").map(String);
  const qtys = formData.getAll("itemQty").map((v) => Number(v) || 0);
  const prices = formData.getAll("itemPrice").map((v) => Number(v) || 0);
  const items: Item[] = descriptions
    .map((d, i) => ({ description: d, qty: qtys[i], unitPrice: prices[i] }))
    .filter((it) => it.description.trim() && it.qty > 0);

  if (items.length === 0) return { error: "Kam se kam ek item add karo." };

  const taxRate = Number(formData.get("taxRate") || 18);
  const { subtotal, taxAmount, total } = computeTotals(items, taxRate);
  const user = await getCurrentUser();

  const quote = await prisma.quotation.create({
    data: {
      number: genNumber("QT"),
      customerId,
      items: items as object,
      subtotal, taxRate, taxAmount, total,
      notes: String(formData.get("notes") || "") || null,
      createdById: user?.id,
      status: "DRAFT",
    },
  });

  revalidatePath("/quotations");
  redirect(`/quotations`);
}

export async function setQuotationStatusAction(id: string, status: QuotationStatus) {
  await prisma.quotation.update({ where: { id }, data: { status } });
  revalidatePath("/quotations");
}

/** Convert an accepted quotation into an invoice. */
export async function convertToInvoiceAction(quotationId: string) {
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
