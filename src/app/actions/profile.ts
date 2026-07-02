"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, createSession, hashPassword } from "@/lib/auth";

/** Update the CURRENT user's own profile (name, email, optional password). */
export async function updateProfileAction(_prev: unknown, formData: FormData) {
  const me = await getCurrentUser();
  if (!me) return { error: "Not authenticated" };

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!name || !email) return { error: "Name and email are required." };

  if (email !== me.email) {
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return { error: "That email is already in use." };
  }

  const data: { name: string; email: string; passwordHash?: string } = { name, email };
  if (password) {
    if (password.length < 6) return { error: "Password must be at least 6 characters." };
    data.passwordHash = await hashPassword(password);
  }

  const updated = await prisma.user.update({ where: { id: me.id }, data });

  // refresh the session so the new name/email show immediately
  await createSession({
    userId: updated.id, email: updated.email, name: updated.name, role: updated.role,
  });

  revalidatePath("/account");
  revalidatePath("/", "layout");
  return { ok: true };
}
