"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { draftEmail } from "@/lib/ai";
import { sendEmail, emailTemplate } from "@/lib/email";

/** Lost Customer Recovery — AI drafts & sends a win-back offer, logs it, nudges health. */
export async function recoverCustomerAction(customerId: string) {
  const c = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!c) return { error: "Customer not found" };

  const { data: draft } = await draftEmail({
    purpose: "Win back an at-risk customer with a special offer",
    name: c.name,
    company: c.company,
    context: "We've missed you. Here's an exclusive offer to welcome you back.",
  });

  let mocked = true;
  if (c.email) {
    const res = await sendEmail({
      to: c.email, toName: c.name,
      subject: draft.subject,
      html: emailTemplate({ title: draft.subject, body: draft.body }),
    });
    mocked = res.mocked;
  }

  await prisma.activity.create({
    data: {
      channel: "EMAIL", direction: "OUTBOUND", customerId: c.id,
      subject: draft.subject,
      content: `${mocked ? "[MOCK] " : ""}Win-back offer sent: ${draft.subject}`,
    },
  });

  // small engagement bump to reflect the outreach attempt
  await prisma.customer.update({
    where: { id: c.id },
    data: { healthScore: Math.min(100, c.healthScore + 8) },
  });

  revalidatePath("/reports");
  revalidatePath(`/customers/${c.id}`);
  return { ok: true, mocked, subject: draft.subject };
}
