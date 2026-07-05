"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { draftEmail } from "@/lib/ai";
import { sendEmail, emailTemplate } from "@/lib/email";

const s = (fd: FormData, k: string) => {
  const v = String(fd.get(k) || "").trim();
  return v || null;
};

/** Manually add a new customer (a converted lead / active client). */
export async function createCustomerAction(_prev: unknown, formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Name is required." };
  const me = await getCurrentUser();

  const tags = String(formData.get("tags") || "")
    .split(",").map((t) => t.trim()).filter(Boolean);

  const customer = await prisma.customer.create({
    data: {
      name,
      company: s(formData, "company"),
      email: s(formData, "email"),
      phone: s(formData, "phone"),
      address: s(formData, "address"),
      altPhone: s(formData, "altPhone"),
      website: s(formData, "website"),
      facebook: s(formData, "facebook"),
      instagram: s(formData, "instagram"),
      twitter: s(formData, "twitter"),
      otherLinks: s(formData, "otherLinks"),
      heroProducts: s(formData, "heroProducts"),
      inquiryReason: s(formData, "inquiryReason"),
      requirement: s(formData, "requirement"),
      contractMonths: formData.get("contractMonths") ? Number(formData.get("contractMonths")) : null,
      onboardedAt: formData.get("onboardedAt") ? new Date(String(formData.get("onboardedAt"))) : null,
      lifetimeValue: Number(formData.get("lifetimeValue") || 0),
      tags,
      ownerId: String(formData.get("ownerId") || "") || me?.id || null,
    },
  });
  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}

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
