import crypto from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword } from "@/lib/auth";

/** Google OAuth callback: exchange code → find/create user → sign in. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  const fail = (msg: string) =>
    NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`);

  if (!code || !clientId || !clientSecret) return fail("Google sign-in failed. Please try again.");

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${origin}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });
    const tok = await tokenRes.json();
    if (!tok.access_token) return fail("Google sign-in failed. Please try again.");

    const infoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    });
    const info = await infoRes.json();
    const email = String(info.email || "").toLowerCase();
    if (!email || info.verified_email === false) return fail("Your Google email could not be verified.");

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: info.name || email.split("@")[0],
          email,
          avatarUrl: info.picture || null,
          passwordHash: await hashPassword(crypto.randomBytes(24).toString("hex")),
          role: "SALES",
        },
      });
    }
    if (!user.isActive) return fail("This account is inactive. Please contact your admin.");

    await createSession({ userId: user.id, email: user.email, name: user.name, role: user.role });
    return NextResponse.redirect(`${origin}/dashboard`);
  } catch {
    return fail("Google sign-in failed. Please try again.");
  }
}
