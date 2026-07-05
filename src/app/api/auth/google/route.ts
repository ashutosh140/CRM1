import { NextResponse, type NextRequest } from "next/server";

/** Start the Google OAuth flow (only if credentials are configured). */
export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();

  if (!clientId) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Google sign-in isn't configured yet. Please use email, or ask the admin to add Google credentials.")}`
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
  });
  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
