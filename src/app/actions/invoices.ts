"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function recordPaymentAction(invoiceId: string, amount: number) {
  const me = await getCurrentUser();
  if (!me) return;
  if (!Number.isFinite(amount) || amount < 0) return;
  const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!inv) return;
  const paidAmount = Math.min(inv.total, inv.paidAmount + amount);
  const status = paidAmount >= inv.total ? "PAID" : paidAmount > 0 ? "PARTIAL" : inv.status;

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { paidAmount, status },
  });

  // bump customer lifetime value + health when they pay
  if (amount > 0) {
    await prisma.customer.update({
      where: { id: inv.customerId },
      data: {
        lifetimeValue: { increment: amount },
        healthScore: { increment: 5 },
      },
    }).catch(() => {});
  }

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
}

/** Edit an invoice's status, due date, and paid amount. */
export async function updateInvoiceAction(_prev: unknown, formData: FormData) {
  const me = await getCurrentUser();
  if (!me) return { error: "Not authenticated" };
  const id = String(formData.get("id") || "");
  const inv = await prisma.invoice.findUnique({ where: { id } });
  if (!inv) return { error: "Invoice not found" };

  const status = String(formData.get("status") || inv.status) as typeof inv.status;
  const dueDate = formData.get("dueDate") ? new Date(String(formData.get("dueDate"))) : null;
  const paidAmount = Math.max(0, Math.min(inv.total, Number(formData.get("paidAmount") || inv.paidAmount)));

  await prisma.invoice.update({
    where: { id },
    data: { status, dueDate, paidAmount },
  });
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  return { ok: true };
}
