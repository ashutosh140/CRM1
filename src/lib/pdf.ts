import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const BRAND = rgb(0.31, 0.27, 0.9); // brand indigo
const DARK = rgb(0.06, 0.09, 0.16);
const GREY = rgb(0.4, 0.45, 0.5);

interface WelcomePdfInput {
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  requirement?: string | null;
  contractMonths?: number | null;
  onboardedAt?: Date | null;
}

/** Generate a professional welcome / onboarding PDF. Returns base64 (no data-URL prefix). */
export async function generateWelcomePdf(input: WelcomePdfInput): Promise<string> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { width } = page.getSize();
  let y = 800;

  // header band
  page.drawRectangle({ x: 0, y: 792, width, height: 50, color: BRAND });
  page.drawText("AI CRM", { x: 40, y: 810, size: 20, font: bold, color: rgb(1, 1, 1) });
  page.drawText("Business Operating System", { x: 40, y: 797, size: 9, font, color: rgb(0.9, 0.9, 1) });

  y = 740;
  const line = (text: string, opts: { size?: number; font?: typeof font; color?: typeof DARK; gap?: number } = {}) => {
    page.drawText(text, { x: 40, y, size: opts.size ?? 11, font: opts.font ?? font, color: opts.color ?? DARK });
    y -= opts.gap ?? 18;
  };

  line("Welcome Aboard!", { size: 22, font: bold, gap: 30 });
  line(`Dear ${input.name}${input.company ? ` (${input.company})` : ""},`, { size: 12, gap: 24 });

  const intro = [
    "Thank you for choosing to work with us. We are truly delighted to welcome you",
    "as a valued partner and look forward to a productive, long-term relationship.",
    "This document outlines the details of our engagement and what to expect next.",
  ];
  intro.forEach((t) => line(t, { color: GREY, gap: 16 }));
  y -= 12;

  line("Engagement Details", { size: 14, font: bold, color: BRAND, gap: 22 });
  const details: [string, string][] = [
    ["Client", input.name],
    ["Company", input.company || "—"],
    ["Email", input.email || "—"],
    ["Phone", input.phone || "—"],
    ["Requirement / Scope", input.requirement || "To be finalised"],
    ["Onboarded On", (input.onboardedAt ?? new Date()).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })],
    ["Contract Term", input.contractMonths ? `${input.contractMonths} months` : "To be agreed"],
  ];
  details.forEach(([k, v]) => {
    page.drawText(`${k}:`, { x: 40, y, size: 11, font: bold, color: DARK });
    page.drawText(String(v).slice(0, 70), { x: 200, y, size: 11, font, color: DARK });
    y -= 18;
  });
  y -= 14;

  line("Our Process", { size: 14, font: bold, color: BRAND, gap: 22 });
  const steps = [
    "1. Kick-off call to align on goals, scope and timelines.",
    "2. A dedicated account manager assigned to your account.",
    "3. Regular updates, reports and check-ins throughout the engagement.",
    "4. Ongoing support and a clear point of contact at every stage.",
  ];
  steps.forEach((t) => line(t, { color: GREY, gap: 17 }));
  y -= 14;

  line("We are excited to begin this journey with you. Should you have any questions,", { color: GREY, gap: 16 });
  line("please reach out to us anytime — we are always happy to help.", { color: GREY, gap: 28 });
  line("Warm regards,", { gap: 16 });
  line("The AI CRM Team", { font: bold });

  // footer
  page.drawLine({ start: { x: 40, y: 60 }, end: { x: width - 40, y: 60 }, thickness: 0.5, color: rgb(0.8, 0.83, 0.88) });
  page.drawText("This is a computer-generated onboarding document.", { x: 40, y: 46, size: 8, font, color: GREY });

  const bytes = await pdf.save();
  return Buffer.from(bytes).toString("base64");
}
