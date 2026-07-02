"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import type { Role } from "@prisma/client";

export async function createUserAction(_prev: unknown, formData: FormData) {
  const me = await getCurrentUser();
  if (!me || me.role !== "ADMIN") return { error: "Only an Admin can create users." };

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const role = (String(formData.get("role") || "SALES")) as Role;

  if (!name || !email || !password) return { error: "All fields are required." };

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { error: "This email is already registered." };

  await prisma.user.create({
    data: { name, email, role, passwordHash: await hashPassword(password) },
  });
  revalidatePath("/settings");
  return { ok: true };
}

export async function toggleUserActiveAction(id: string) {
  const me = await getCurrentUser();
  if (!me || me.role !== "ADMIN" || me.id === id) return;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return;
  await prisma.user.update({ where: { id }, data: { isActive: !user.isActive } });
  revalidatePath("/settings");
}
