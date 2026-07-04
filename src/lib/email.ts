/**
 * Email service via Brevo (https://www.brevo.com) transactional API.
 *
 * Mock-safe: if BREVO_API_KEY is missing, emails are logged to the console and
 * reported as "mocked" instead of being sent — the app keeps working in demos.
 */
const BREVO_API_KEY = process.env.BREVO_API_KEY?.trim();
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL?.trim() || "no-reply@aicrm.app";
const SENDER_NAME = process.env.BREVO_SENDER_NAME?.trim() || "AI CRM";

export const emailEnabled = Boolean(BREVO_API_KEY);

export interface SendEmailInput {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  attachments?: { name: string; contentBase64: string }[];
}

export async function sendEmail(
  input: SendEmailInput
): Promise<{ ok: boolean; mocked: boolean; error?: string }> {
  if (!input.to) return { ok: false, mocked: true, error: "no recipient" };

  if (!BREVO_API_KEY) {
    console.log(`[email:mock] → ${input.to} | ${input.subject}`);
    return { ok: true, mocked: true };
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email: input.to, name: input.toName || input.to }],
        subject: input.subject,
        htmlContent: input.html,
        ...(input.attachments && input.attachments.length
          ? { attachment: input.attachments.map((a) => ({ name: a.name, content: a.contentBase64 })) }
          : {}),
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[email] Brevo error:", res.status, text);
      return { ok: false, mocked: false, error: `Brevo ${res.status}` };
    }
    return { ok: true, mocked: false };
  } catch (err) {
    console.error("[email] send failed:", err);
    return { ok: false, mocked: false, error: String(err) };
  }
}

/** Minimal branded HTML wrapper for outbound emails. */
export function emailTemplate(opts: { title: string; body: string; cta?: { label: string; url: string } }) {
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="background:#4f46e5;color:#fff;padding:16px 20px;border-radius:12px 12px 0 0;font-weight:bold;font-size:18px">AI CRM</div>
    <div style="background:#fff;padding:24px 20px;border-radius:0 0 12px 12px;color:#0f172a;line-height:1.6">
      <h2 style="margin:0 0 12px;font-size:18px">${opts.title}</h2>
      <div style="white-space:pre-line;color:#334155">${opts.body}</div>
      ${opts.cta ? `<div style="margin-top:20px"><a href="${opts.cta.url}" style="background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;display:inline-block">${opts.cta.label}</a></div>` : ""}
    </div>
    <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px">Sent by AI CRM · Business Operating System</p>
  </div></body></html>`;
}
