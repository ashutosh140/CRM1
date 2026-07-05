import { cache } from "react";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { Role } from "@prisma/client";

const SESSION_COOKIE = "aicrm_session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-insecure-secret-change-me"
);

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: Role;
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// ── Password-reset OTP (stored in a short-lived signed cookie, no DB needed) ──
const RESET_COOKIE = "aicrm_reset";

export async function createResetToken(email: string, otpHash: string) {
  const token = await new SignJWT({ email, otpHash })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(secret);
  const cookieStore = await cookies();
  cookieStore.set(RESET_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
}

export async function readResetToken(): Promise<{ email: string; otpHash: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(RESET_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return { email: payload.email as string, otpHash: payload.otpHash as string };
  } catch {
    return null;
  }
}

export async function clearResetToken() {
  const cookieStore = await cookies();
  cookieStore.delete(RESET_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/** Full DB user for the current session, or null.
 *  Wrapped in React cache() so repeated calls within one request (layout + page)
 *  hit the DB only once. */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.userId } });
});

export const ROLE_RANK: Record<Role, number> = {
  ADMIN: 4,
  MANAGER: 3,
  SALES: 2,
  EMPLOYEE: 1,
};

export function hasRole(role: Role, atLeast: Role) {
  return ROLE_RANK[role] >= ROLE_RANK[atLeast];
}
