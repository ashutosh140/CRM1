"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, createSession, hashPassword, verifyPassword } from "@/lib/auth";

/** Update the CURRENT user's own profile (name, email, optional password). */
export async function updateProfileAction(_prev: unknown, formData: FormData) {
  const me = await getCurrentUser();
  if (!me) return { error: "Not authenticated" };

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();

  if (!name || !email) return { error: "Name and email are required." };

  if (email !== me.email) {
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return { error: "That email is already in use." };
  }

  const updated = await prisma.user.update({ where: { id: me.id }, data: { name, email } });

  // refresh the session so the new name/email show immediately
  await createSession({
    userId: updated.id, email: updated.email, name: updated.name, role: updated.role,
  });

  revalidatePath("/account");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Change the current user's password (requires the current password). */
export async function changePasswordAction(_prev: unknown, formData: FormData) {
  const me = await getCurrentUser();
  if (!me) return { error: "Not authenticated" };

  const current = String(formData.get("current") || "");
  const next = String(formData.get("next") || "");
  const confirm = String(formData.get("confirm") || "");

  if (!current || !next) return { error: "All password fields are required." };

  const ok = await verifyPassword(current, me.passwordHash);
  if (!ok) return { error: "Current password is incorrect." };
  if (next.length < 6) return { error: "New password must be at least 6 characters." };
  if (next !== confirm) return { error: "New passwords do not match." };
  if (next === current) return { error: "New password must be different from the current one." };

  await prisma.user.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(next) } });
  return { ok: true };
}
