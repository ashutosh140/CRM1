"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  scoreLead, extractLead, analyzeConversation, suggestFollowup,
} from "@/lib/ai";
import { runNewLeadWorkflow } from "@/lib/workflows";
import type { LeadSource, LeadStatus, Channel } from "@prisma/client";

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
      company: String(formData.get("company") || "") || null,
      email: String(formData.get("email") || "") || null,
      phone: String(formData.get("phone") || "") || null,
      source,
      productRequirement: String(formData.get("productRequirement") || "") || null,
      estimatedValue,
      ownerId,
      stageId: firstStage?.id ?? null,
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
