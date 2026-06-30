"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function recordPaymentAction(invoiceId: string, amount: number) {
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
}
