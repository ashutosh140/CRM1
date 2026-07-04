"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  scoreLead, extractLead, analyzeConversation, suggestFollowup,
} from "@/lib/ai";
import { runNewLeadWorkflow, sendWelcomeEmail } from "@/lib/workflows";
import type { LeadSource, LeadStatus, Channel } from "@prisma/client";

const str = (fd: FormData, k: string) => {
  const v = String(fd.get(k) || "").trim();
  return v || null;
};

/** Extended editable lead fields shared by create & update. */
function extractLeadFields(fd: FormData) {
  return {
    company: str(fd, "company"),
    email: str(fd, "email"),
    phone: str(fd, "phone"),
    productRequirement: str(fd, "productRequirement"),
    altPhone: str(fd, "altPhone"),
    website: str(fd, "website"),
    facebook: str(fd, "facebook"),
    instagram: str(fd, "instagram"),
    twitter: str(fd, "twitter"),
    otherLinks: str(fd, "otherLinks"),
    heroProducts: str(fd, "heroProducts"),
    inquiryReason: str(fd, "inquiryReason"),
    onboardedAt: fd.get("onboardedAt") ? new Date(String(fd.get("onboardedAt"))) : null,
    contractMonths: fd.get("contractMonths") ? Number(fd.get("contractMonths")) : null,
  };
}

/** AI Lead Assignment — pick the SALES user with the fewest open leads. */
async function pickBestSalesUser(): Promise<string | null> {
  const salesUsers = await prisma.user.findMany({
    where: { role: { in: ["SALES", "MANAGER"] }, isActive: true },
    select: { id: true, _count: { select: { ownedLeads: { where: { status: { notIn: ["WON", "LOST"] } } } } } },
  });
  if (salesUsers.length === 0) return null;
  salesUsers.sort((a, b) => a._count.ownedLeads - b._count.ownedLeads);
  return salesUsers[0].id;
}

export async function createLeadAction(_prev: unknown, formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Name is required." };

  const source = (String(formData.get("source") || "MANUAL")) as LeadSource;
  const estimatedValue = Number(formData.get("estimatedValue") || 0);

  const ownerId = (await pickBestSalesUser()) ?? (await getCurrentUser())?.id ?? null;

  const firstStage = await prisma.pipelineStage.findFirst({ orderBy: { order: "asc" } });

  const lead = await prisma.lead.create({
    data: {
      name,
      source,
      estimatedValue,
      ownerId,
      stageId: firstStage?.id ?? null,
      ...extractLeadFields(formData),
    },
  });

  // AI scoring on create
  const { data: s } = await scoreLead({
    name: lead.name, company: lead.company, email: lead.email, phone: lead.phone,
    productRequirement: lead.productRequirement, estimatedValue: lead.estimatedValue,
    source: lead.source, status: lead.status,
  });
  await prisma.lead.update({
    where: { id: lead.id },
    data: { score: s.score, intent: s.intent, urgency: s.urgency, closingProbability: s.closingProbability },
  });

  // Autonomous workflow: welcome email + follow-up task + manager alert
  await runNewLeadWorkflow(lead.id);

  revalidatePath("/leads");
  redirect(`/leads/${lead.id}`);
}

/** "Zero Manual Data Entry" — paste a raw message, AI creates the lead. */
export async function captureLeadAction(_prev: unknown, formData: FormData) {
  const message = String(formData.get("message") || "").trim();
  const source = (String(formData.get("source") || "WHATSAPP")) as LeadSource;
  if (!message) return { error: "Please paste a message." };

  const { data: extracted, mocked } = await extractLead(message, source);
  const ownerId = await pickBestSalesUser();
  const firstStage = await prisma.pipelineStage.findFirst({ orderBy: { order: "asc" } });

  const lead = await prisma.lead.create({
    data: {
      name: extracted.name || "Unknown Lead",
      company: extracted.company,
      email: extracted.email,
      phone: extracted.phone,
      productRequirement: extracted.productRequirement,
      source,
      ownerId,
      stageId: firstStage?.id ?? null,
    },
  });

  // log the original inbound message + analyse it
  const { data: analysis } = await analyzeConversation(message);
  await prisma.activity.create({
    data: {
      channel: source === "EMAIL" ? "EMAIL" : "WHATSAPP",
      direction: "INBOUND",
      content: message,
      sentiment: analysis.sentiment,
      intentScore: analysis.intent,
      leadId: lead.id,
    },
  });

  const { data: s } = await scoreLead({
    name: lead.name, company: lead.company, email: lead.email, phone: lead.phone,
    productRequirement: lead.productRequirement, estimatedValue: 0,
    source: lead.source, status: lead.status,
  });
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      score: s.score, intent: analysis.intent, urgency: analysis.urgency,
      closingProbability: s.closingProbability,
    },
  });

  // Autonomous workflow
  await runNewLeadWorkflow(lead.id);

  revalidatePath("/leads");
  redirect(`/leads/${lead.id}?captured=${mocked ? "mock" : "ai"}`);
}

export async function updateLeadStatusAction(leadId: string, status: LeadStatus) {
  await prisma.lead.update({ where: { id: leadId }, data: { status } });
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  revalidatePath(`/leads/${leadId}`);
}

export async function moveLeadStageAction(leadId: string, stageId: string) {
  await prisma.lead.update({ where: { id: leadId }, data: { stageId } });
  revalidatePath("/pipeline");
}

export async function addActivityAction(_prev: unknown, formData: FormData) {
  const leadId = String(formData.get("leadId"));
  const content = String(formData.get("content") || "").trim();
  const channel = (String(formData.get("channel") || "NOTE")) as Channel;
  if (!content) return { error: "Content is required." };

  const user = await getCurrentUser();
  const { data: analysis } = await analyzeConversation(content);

  await prisma.activity.create({
    data: {
      leadId, content, channel, direction: "INBOUND",
      sentiment: analysis.sentiment, intentScore: analysis.intent,
      userId: user?.id,
    },
  });

  // refresh intent/urgency on the lead from latest conversation
  await prisma.lead.update({
    where: { id: leadId },
    data: { intent: analysis.intent, urgency: analysis.urgency, lastContactedAt: new Date() },
  });

  revalidatePath(`/leads/${leadId}`);
  return { ok: true, analysis };
}

/** Edit all core + extended fields of a lead. */
export async function updateLeadAction(_prev: unknown, formData: FormData) {
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  if (!id || !name) return { error: "Name is required." };

  await prisma.lead.update({
    where: { id },
    data: {
      name,
      source: String(formData.get("source") || "MANUAL") as LeadSource,
      status: String(formData.get("status") || "NEW") as LeadStatus,
      estimatedValue: Number(formData.get("estimatedValue") || 0),
      ...extractLeadFields(formData),
    },
  });
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  return { ok: true };
}

export async function deleteLeadAction(leadId: string) {
  await prisma.activity.deleteMany({ where: { leadId } });
  await prisma.task.updateMany({ where: { leadId }, data: { leadId: null } });
  await prisma.aiInsight.deleteMany({ where: { leadId } });
  await prisma.lead.delete({ where: { id: leadId } });
  revalidatePath("/leads");
  redirect("/leads");
}

/** Manually (re)send the professional welcome email + onboarding PDF to a lead. */
export async function sendLeadWelcomeEmailAction(leadId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { error: "Lead not found" };
  if (!lead.email) return { error: "This lead has no email address." };

  const res = await sendWelcomeEmail(lead);
  await prisma.activity.create({
    data: {
      channel: "EMAIL", direction: "OUTBOUND", leadId: lead.id,
      subject: `Welcome to AI CRM, ${lead.name}!`,
      content: res.mocked ? `[MOCK] Welcome email + PDF to ${lead.email}` : `Welcome email + onboarding PDF sent to ${lead.email}`,
    },
  });
  revalidatePath(`/leads/${leadId}`);
  return { ok: res.ok, mocked: res.mocked, error: res.ok ? undefined : (res.error || "Send failed") };
}

export async function rescoreLeadAction(leadId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return;
  const { data: s } = await scoreLead({
    name: lead.name, company: lead.company, email: lead.email, phone: lead.phone,
    productRequirement: lead.productRequirement, estimatedValue: lead.estimatedValue,
    source: lead.source, status: lead.status,
  });
  await prisma.lead.update({
    where: { id: leadId },
    data: { score: s.score, intent: s.intent, urgency: s.urgency, closingProbability: s.closingProbability },
  });
  revalidatePath(`/leads/${leadId}`);
}
