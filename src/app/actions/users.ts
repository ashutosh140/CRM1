"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword, hasRole, ROLE_RANK } from "@/lib/auth";
import { sendEmail, emailTemplate } from "@/lib/email";
import type { Role } from "@prisma/client";

const LOGIN_URL = (process.env.APP_URL?.trim() || "https://ai-crm-three-chi.vercel.app") + "/login";

const s = (fd: FormData, k: string) => {
  const v = String(fd.get(k) || "").trim();
  return v || null;
};

/** Email a freshly-created user their login details. Best-effort (never blocks). */
async function sendWelcome(name: string, email: string, password: string, role: Role) {
  try {
    await sendEmail({
      to: email,
      toName: name,
      subject: "Your AI CRM account is ready — log in to your dashboard",
      html: emailTemplate({
        title: `Welcome to AI CRM, ${name}!`,
        body:
          `An account has been created for you as <b>${role.replace("_", " ")}</b>. You can now log in to your dashboard.<br/><br/>` +
          `<b>Login email:</b> ${email}<br/>` +
          `<b>Temporary password:</b> ${password}<br/><br/>` +
          `For your security, please change this password from <b>My Account</b> after your first login.`,
        cta: { label: "Log in to your dashboard", url: LOGIN_URL },
      }),
    });
  } catch { /* email failure must not block user creation */ }
}

export async function createUserAction(_prev: unknown, formData: FormData) {
  const me = await getCurrentUser();
  if (!me || !hasRole(me.role, "ADMIN")) return { error: "Only an Admin can create users." };

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const role = (String(formData.get("role") || "SALES")) as Role;

  if (!name || !email || !password) return { error: "Name, email and password are required." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Please enter a valid email address." };
  if (password.length < 6) return { error: "Temp password must be at least 6 characters." };
  // Only a Super Admin may create Admin / Super Admin accounts.
  const canAssign = me.role === "SUPER_ADMIN" || ROLE_RANK[role] < ROLE_RANK[me.role];
  if (!canAssign) return { error: "You don't have permission to assign that role." };

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { error: "This email is already registered." };

  await prisma.user.create({
    data: {
      name, email, role,
      passwordHash: await hashPassword(password),
      phone: s(formData, "phone"),
      aadhaar: s(formData, "aadhaar"),
      pan: s(formData, "pan"),
    },
  });

  await sendWelcome(name, email, password, role);
  revalidatePath("/settings");
  return { ok: true };
}

export async function updateUserAction(_prev: unknown, formData: FormData) {
  const me = await getCurrentUser();
  if (!me || !hasRole(me.role, "ADMIN")) return { error: "Only an Admin can edit users." };

  const id = String(formData.get("id") || "");
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { error: "User not found." };

  // A plain Admin cannot edit an Admin/Super Admin; only a Super Admin can.
  const canManage = me.role === "SUPER_ADMIN" || ROLE_RANK[target.role] < ROLE_RANK[me.role] || target.id === me.id;
  if (!canManage) return { error: "You don't have permission to edit this user." };

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = (String(formData.get("role") || target.role)) as Role;
  const password = String(formData.get("password") || "");

  if (!name || !email) return { error: "Name and email are required." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Please enter a valid email address." };

  // email uniqueness (if changed)
  if (email !== target.email) {
    const clash = await prisma.user.findUnique({ where: { email } });
    if (clash) return { error: "That email is already used by another user." };
  }

  // role changes: can't change your own role (avoid self-lockout); only assign roles you're allowed to
  let newRole = target.role;
  if (id !== me.id && role !== target.role) {
    const canAssign = me.role === "SUPER_ADMIN" || ROLE_RANK[role] < ROLE_RANK[me.role];
    if (!canAssign) return { error: "You don't have permission to assign that role." };
    newRole = role;
  }

  if (password && password.length < 6) return { error: "New password must be at least 6 characters." };

  await prisma.user.update({
    where: { id },
    data: {
      name, email, role: newRole,
      phone: s(formData, "phone"),
      aadhaar: s(formData, "aadhaar"),
      pan: s(formData, "pan"),
      ...(password ? { passwordHash: await hashPassword(password) } : {}),
    },
  });

  revalidatePath("/settings");
  return { ok: true };
}

export async function deleteUserAction(id: string) {
  const me = await getCurrentUser();
  if (!me || !hasRole(me.role, "ADMIN")) return { error: "Only an Admin can delete users." };
  if (id === me.id) return { error: "You can't delete your own account." };

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { error: "User not found." };

  const canManage = me.role === "SUPER_ADMIN" || ROLE_RANK[target.role] < ROLE_RANK[me.role];
  if (!canManage) return { error: "You don't have permission to delete this user." };

  // Clean up FK-restricted rows, reassign groups they created, then delete.
  // (Leads/customers/tasks/quotations/reports auto-detach via SetNull; messages,
  //  notifications, group memberships cascade-delete.)
  await prisma.$transaction([
    prisma.performance.deleteMany({ where: { userId: id } }),
    prisma.group.updateMany({ where: { createdById: id }, data: { createdById: me.id } }),
    prisma.user.delete({ where: { id } }),
  ]);

  revalidatePath("/settings");
  return { ok: true };
}

export async function toggleUserActiveAction(id: string) {
  const me = await getCurrentUser();
  if (!me || !hasRole(me.role, "ADMIN") || me.id === id) return;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return;
  // A plain Admin cannot deactivate an Admin/Super Admin; only a Super Admin can.
  const canManage = me.role === "SUPER_ADMIN" || ROLE_RANK[user.role] < ROLE_RANK[me.role];
  if (!canManage) return;
  await prisma.user.update({ where: { id }, data: { isActive: !user.isActive } });
  revalidatePath("/settings");
}
