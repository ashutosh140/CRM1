"use server";

import crypto from "crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  destroySession,
  verifyPassword,
  hashPassword,
  createResetToken,
  readResetToken,
  clearResetToken,
} from "@/lib/auth";
import { sendEmail, emailTemplate } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/ratelimit";

async function limit(scope: string, max: number, windowMs: number) {
  const ip = clientIp(await headers());
  return rateLimit(`${scope}:${ip}`, max, windowMs);
}

export async function loginAction(_prev: unknown, formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { error: "Email and password are both required." };
  }

  const rl = await limit("login", 8, 60_000);
  if (!rl.ok) return { error: `Too many attempts. Please try again in ${rl.retryAfter}s.` };

  const user = await prisma.user.findUnique({ where: { email } });
  // Generic message on both branches so we never reveal which emails exist.
  if (!user || !user.isActive) {
    return { error: "Invalid email or password." };
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return { error: "Invalid email or password." };
  }

  await createSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

/** Create a new account and sign in. */
export async function signupAction(_prev: unknown, formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");

  if (!name || !email || !password) return { error: "All fields are required." };
  const rl = await limit("signup", 5, 60_000);
  if (!rl.ok) return { error: `Too many attempts. Please try again in ${rl.retryAfter}s.` };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Please enter a valid email address." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };
  if (password !== confirm) return { error: "Passwords do not match." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with this email already exists. Try signing in." };

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await hashPassword(password), role: "SALES" },
  });

  await createSession({ userId: user.id, email: user.email, name: user.name, role: user.role });
  redirect("/dashboard");
}

/** Step 1 of reset: email a 6-digit OTP and stash it in a signed cookie. */
export async function requestResetAction(_prev: unknown, formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) return { error: "Please enter your email." };

  const rl = await limit("reset", 4, 300_000);
  if (!rl.ok) return { error: `Too many requests. Please try again in ${rl.retryAfter}s.` };

  const user = await prisma.user.findUnique({ where: { email } });
  if (user && user.isActive) {
    const otp = String(crypto.randomInt(100000, 1000000));
    await createResetToken(email, await hashPassword(otp));
    await sendEmail({
      to: email,
      toName: user.name,
      subject: "Your AI CRM password reset code",
      html: emailTemplate({
        title: "Password reset code",
        body: `Use this verification code to reset your password:<br/><br/><span style="font-size:30px;font-weight:bold;letter-spacing:8px;color:#4f46e5">${otp}</span><br/><br/>This code expires in 10 minutes. If you didn't request a reset, you can safely ignore this email.`,
      }),
    });
  }
  // Always report success so we never leak which emails exist.
  return { ok: true, email };
}

/** Step 2 of reset: verify the OTP, set the new password, and sign in. */
export async function resetPasswordAction(_prev: unknown, formData: FormData) {
  const otp = String(formData.get("otp") || "").trim();
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");

  if (!otp || !password) return { error: "Code and new password are required." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };
  if (password !== confirm) return { error: "Passwords do not match." };

  const rl = await limit("otp", 6, 300_000);
  if (!rl.ok) return { error: `Too many attempts. Please request a new code.` };

  const reset = await readResetToken();
  if (!reset) return { error: "Your code has expired. Please request a new one." };

  const ok = await verifyPassword(otp, reset.otpHash);
  if (!ok) return { error: "Incorrect code. Please check your email and try again." };

  const user = await prisma.user.findUnique({ where: { email: reset.email } });
  if (!user) return { error: "Account not found." };

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } });
  await clearResetToken();
  await createSession({ userId: user.id, email: user.email, name: user.name, role: user.role });
  redirect("/dashboard");
}
