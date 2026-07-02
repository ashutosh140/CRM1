/**
 * AI adapter — single entry point for all AI features.
 *
 * Design goal: the app must run with ZERO config. If OPENAI_API_KEY is not set,
 * every function falls back to a deterministic heuristic "mock" so the CRM is
 * fully demonstrable without spending a paisa. Drop the key in `.env` and the
 * exact same calls hit OpenAI instead — no other code changes.
 */
import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY?.trim();
const MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

export const aiEnabled = Boolean(apiKey);

// Tight timeout + no retries so a slow/hanging OpenAI never blocks page render
// (it falls back to the heuristic instead). Prevents serverless function timeouts.
const client = aiEnabled
  ? new OpenAI({ apiKey, timeout: 7000, maxRetries: 0 })
  : null;

/** Low-level helper: ask the model for JSON, with a typed fallback. */
async function askJSON<T>(
  system: string,
  user: string,
  fallback: T
): Promise<{ data: T; mocked: boolean }> {
  if (!client) return { data: fallback, mocked: true };
  try {
    const res = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const raw = res.choices[0]?.message?.content ?? "{}";
    return { data: { ...fallback, ...JSON.parse(raw) } as T, mocked: false };
  } catch (err) {
    console.error("[ai] OpenAI call failed, using fallback:", err);
    return { data: fallback, mocked: true };
  }
}

// ───────────────────────── Heuristics (mock brains) ─────────────────────────

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function keywordScore(text: string, words: string[]) {
  const t = (text || "").toLowerCase();
  return words.reduce((acc, w) => acc + (t.includes(w) ? 1 : 0), 0);
}

// ───────────────────────── Public AI features ─────────────────────────

export interface LeadExtraction {
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  productRequirement: string | null;
}

/** "Zero Manual Data Entry" — pull structured lead fields from a raw message. */
export async function extractLead(
  message: string,
  source: string
): Promise<{ data: LeadExtraction; mocked: boolean }> {
  const emailMatch = message.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] ?? null;
  const phoneMatch =
    message.match(/(\+?\d[\d\s-]{8,}\d)/)?.[0]?.replace(/\s+/g, "") ?? null;
  const fallback: LeadExtraction = {
    name: "Unknown Lead",
    company: null,
    email: emailMatch,
    phone: phoneMatch,
    productRequirement: message.slice(0, 120),
  };
  return askJSON<LeadExtraction>(
    `You extract CRM lead details from an inbound ${source} message. ` +
      `Return JSON with keys: name, company, email, phone, productRequirement. ` +
      `Use null when unknown. Be concise.`,
    message,
    fallback
  );
}

export interface ConversationAnalysis {
  sentiment: "positive" | "neutral" | "negative";
  intent: number; // 0-100 buying intent
  urgency: number; // 0-100
  objection: string | null;
  nextBestAction: string;
  summary: string;
}

/** "AI Conversation Analyzer" — mood, intent, urgency, next best action. */
export async function analyzeConversation(
  text: string
): Promise<{ data: ConversationAnalysis; mocked: boolean }> {
  const positive = keywordScore(text, [
    "interested", "buy", "purchase", "great", "yes", "deal", "order", "confirm",
  ]);
  const negative = keywordScore(text, [
    "expensive", "costly", "later", "not sure", "competitor", "no", "busy",
  ]);
  const urgent = keywordScore(text, [
    "urgent", "asap", "today", "immediately", "quick", "now",
  ]);
  const intent = clamp(40 + positive * 12 - negative * 10);
  const fallback: ConversationAnalysis = {
    sentiment: positive >= negative ? (positive > 0 ? "positive" : "neutral") : "negative",
    intent,
    urgency: clamp(20 + urgent * 20),
    objection: negative > 0 ? "Possible price / timing objection" : null,
    nextBestAction:
      intent > 60 ? "Send quotation and follow up in 2 days" : "Nurture with value content, follow up in 5 days",
    summary: text.slice(0, 160),
  };
  return askJSON<ConversationAnalysis>(
    `You are a sales conversation analyst. Analyse the customer message and return JSON: ` +
      `sentiment(positive|neutral|negative), intent(0-100), urgency(0-100), objection(string|null), ` +
      `nextBestAction(string), summary(string).`,
    text,
    fallback
  );
}

export interface LeadScoring {
  score: number;
  intent: number;
  urgency: number;
  closingProbability: number;
  reasoning: string;
}

/** "AI Business Brain" lead scoring. */
export async function scoreLead(lead: {
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  productRequirement?: string | null;
  estimatedValue?: number;
  source: string;
  status: string;
}): Promise<{ data: LeadScoring; mocked: boolean }> {
  let base = 30;
  if (lead.email) base += 12;
  if (lead.phone) base += 12;
  if (lead.company) base += 10;
  if (lead.productRequirement) base += 12;
  if ((lead.estimatedValue ?? 0) > 0) base += 10;
  const sourceBoost: Record<string, number> = {
    REFERRAL: 14, WEBSITE: 10, WHATSAPP: 8, EMAIL: 6, PHONE: 6,
    FACEBOOK: 4, INSTAGRAM: 4, MANUAL: 2,
  };
  base += sourceBoost[lead.source] ?? 0;
  const score = clamp(base);
  const fallback: LeadScoring = {
    score,
    intent: clamp(score - 5),
    urgency: clamp(score - 20),
    closingProbability: clamp(score - 10),
    reasoning:
      "Heuristic score from contactability, source quality and stated requirement. " +
      "Add OPENAI_API_KEY for richer AI scoring.",
  };
  return askJSON<LeadScoring>(
    `You are a B2B lead scoring engine. Given the lead JSON, return: score(0-100 overall quality), ` +
      `intent(0-100), urgency(0-100), closingProbability(0-100), reasoning(string).`,
    JSON.stringify(lead),
    fallback
  );
}

export interface FollowupSuggestion {
  channel: "WHATSAPP" | "EMAIL" | "SMS";
  sendInDays: number;
  message: string;
}

/** "Smart Auto Follow-up Engine" — best channel/time/message. */
export async function suggestFollowup(ctx: {
  name: string;
  status: string;
  lastContactedAt?: string | null;
  productRequirement?: string | null;
}): Promise<{ data: FollowupSuggestion; mocked: boolean }> {
  const fallback: FollowupSuggestion = {
    channel: "WHATSAPP",
    sendInDays: 2,
    message:
      `Hi ${ctx.name}, just following up on your interest` +
      (ctx.productRequirement ? ` in ${ctx.productRequirement}` : "") +
      `. Happy to answer any questions — when works for a quick call?`,
  };
  return askJSON<FollowupSuggestion>(
    `You craft a single follow-up. Return JSON: channel(WHATSAPP|EMAIL|SMS), sendInDays(number), ` +
      `message(short, friendly, personalised).`,
    JSON.stringify(ctx),
    fallback
  );
}

export interface BusinessInsight {
  title: string;
  body: string;
}

/** "AI Business Assistant" — daily insights from aggregate stats. */
export async function businessInsights(stats: Record<string, unknown>): Promise<{
  data: { insights: BusinessInsight[] };
  mocked: boolean;
}> {
  const fallback = {
    insights: [
      {
        title: "Focus on hot leads",
        body: "Prioritise leads with score above 70 — they have the highest closing probability today.",
      },
      {
        title: "Follow-ups pending",
        body: "Several leads have had no contact in over 5 days. Trigger the smart follow-up engine to re-engage them.",
      },
    ] as BusinessInsight[],
  };
  return askJSON(
    `You are an AI business assistant for a sales team. From the metrics JSON, produce 2-4 concise, ` +
      `action-oriented insights. Return JSON: { "insights": [ { "title", "body" } ] }.`,
    JSON.stringify(stats),
    fallback
  );
}

// ───────────────────────── Phase 2/3 AI features ─────────────────────────

export interface Proposal {
  coverLetter: string;
  executiveSummary: string;
  scope: string[];
  closing: string;
}

/** "AI Proposal Generator" — turn a quotation into a polished proposal. */
export async function generateProposal(ctx: {
  customerName: string;
  company?: string | null;
  items: { description: string; qty: number; unitPrice: number }[];
  total: number;
  notes?: string | null;
}): Promise<{ data: Proposal; mocked: boolean }> {
  const itemList = ctx.items.map((i) => `• ${i.description} (x${i.qty})`).join("\n");
  const fallback: Proposal = {
    coverLetter:
      `Dear ${ctx.customerName},\n\nThank you for the opportunity to work with ${ctx.company ?? "your team"}. ` +
      `We are pleased to present this proposal tailored to your requirements.`,
    executiveSummary:
      `This proposal covers the following solution at a total investment of ₹${ctx.total.toLocaleString("en-IN")}, ` +
      `designed to deliver measurable value and a smooth rollout.`,
    scope: ctx.items.map((i) => i.description),
    closing:
      `We are confident this solution meets your needs and look forward to partnering with you. ` +
      `Please reach out with any questions.`,
  };
  return askJSON<Proposal>(
    `You write professional B2B sales proposals. Given the customer and line items, return JSON: ` +
      `coverLetter(string), executiveSummary(string), scope(string[]), closing(string). Warm, concise, persuasive.`,
    `Customer: ${ctx.customerName}\nCompany: ${ctx.company ?? "-"}\nItems:\n${itemList}\nTotal: ${ctx.total}\nNotes: ${ctx.notes ?? "-"}`,
    fallback
  );
}

export interface MeetingSummary {
  summary: string;
  actionItems: string[];
  tasks: { title: string; assignee?: string | null }[];
  nextMeeting: string | null;
}

/** "Auto Meeting Summary" — transcript -> summary, action items, tasks. */
export async function summarizeMeeting(
  transcript: string
): Promise<{ data: MeetingSummary; mocked: boolean }> {
  const fallback: MeetingSummary = {
    summary: transcript.slice(0, 280) + (transcript.length > 280 ? "…" : ""),
    actionItems: ["Follow up on discussed points", "Share requested information"],
    tasks: [{ title: "Send follow-up email after meeting" }],
    nextMeeting: null,
  };
  return askJSON<MeetingSummary>(
    `You summarise sales/business meeting transcripts. Return JSON: summary(string), ` +
      `actionItems(string[]), tasks([{title, assignee}]), nextMeeting(string|null).`,
    transcript.slice(0, 8000),
    fallback
  );
}

export interface DigitalTwin {
  bestTimeToCall: string;
  bestOffer: string;
  topicsToAvoid: string[];
  recommendedTone: string;
  closingProbability: number;
  summary: string;
}

/** "Digital Twin of Every Customer" — AI profile & call-prep. */
export async function digitalTwin(ctx: {
  name: string;
  company?: string | null;
  healthScore: number;
  lifetimeValue: number;
  recentActivity: string[];
}): Promise<{ data: DigitalTwin; mocked: boolean }> {
  const fallback: DigitalTwin = {
    bestTimeToCall: "Weekday mornings (10–12)",
    bestOffer: ctx.healthScore < 40 ? "Loyalty win-back discount" : "Premium upsell bundle",
    topicsToAvoid: ctx.healthScore < 40 ? ["Past delays", "Price increases"] : [],
    recommendedTone: ctx.healthScore < 40 ? "Empathetic & reassuring" : "Confident & consultative",
    closingProbability: clamp(ctx.healthScore + 10),
    summary:
      `${ctx.name} has a health score of ${ctx.healthScore} and lifetime value of ₹${ctx.lifetimeValue.toLocaleString("en-IN")}. ` +
      (ctx.healthScore < 40 ? "At risk — prioritise retention." : "Engaged — good growth opportunity."),
  };
  return askJSON<DigitalTwin>(
    `You build a "digital twin" call-prep profile for a customer. Return JSON: bestTimeToCall(string), ` +
      `bestOffer(string), topicsToAvoid(string[]), recommendedTone(string), closingProbability(0-100), summary(string).`,
    JSON.stringify(ctx),
    fallback
  );
}

export interface PricingAdvice {
  maxSafeDiscountPct: number;
  recommendedPrice: number;
  expectedProfit: number;
  winningProbability: number;
  rationale: string;
}

/** "Dynamic Pricing Recommendation". */
export async function dynamicPricing(ctx: {
  listTotal: number;
  requestedDiscountPct?: number;
  customerHealth?: number;
}): Promise<{ data: PricingAdvice; mocked: boolean }> {
  const maxDisc = ctx.customerHealth && ctx.customerHealth > 60 ? 8 : 15;
  const recommendedPrice = Math.round(ctx.listTotal * (1 - maxDisc / 100));
  const fallback: PricingAdvice = {
    maxSafeDiscountPct: maxDisc,
    recommendedPrice,
    expectedProfit: Math.round(recommendedPrice * 0.35),
    winningProbability: clamp(60 + maxDisc),
    rationale: `A discount up to ${maxDisc}% keeps margins healthy while staying competitive.`,
  };
  return askJSON<PricingAdvice>(
    `You are a pricing strategist. Given list total, requested discount and customer health, return JSON: ` +
      `maxSafeDiscountPct(number), recommendedPrice(number), expectedProfit(number), winningProbability(0-100), rationale(string).`,
    JSON.stringify(ctx),
    fallback
  );
}

export interface DraftEmail {
  subject: string;
  body: string;
}

/** Generic AI email drafter (welcome, win-back, follow-up). */
export async function draftEmail(ctx: {
  purpose: string;
  name: string;
  company?: string | null;
  context?: string;
}): Promise<{ data: DraftEmail; mocked: boolean }> {
  const fallback: DraftEmail = {
    subject: `${ctx.purpose} — ${ctx.company ?? ctx.name}`,
    body:
      `Hi ${ctx.name},\n\n${ctx.context ?? "Thank you for your interest. We'd love to help you move forward."}\n\n` +
      `Best regards,\nThe Team`,
  };
  return askJSON<DraftEmail>(
    `You write short, friendly, professional B2B emails. Return JSON: subject(string), body(string). ` +
      `Purpose: ${ctx.purpose}.`,
    JSON.stringify(ctx),
    fallback
  );
}
