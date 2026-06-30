import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractLead, analyzeConversation, scoreLead } from "@/lib/ai";
import { runNewLeadWorkflow } from "@/lib/workflows";
import type { LeadSource } from "@prisma/client";

/**
 * Automatic Lead Capture webhook.
 *
 * Point your WhatsApp / Website form / Email parser / Meta lead-ads webhook here:
 *   POST /api/webhooks/inbound
 *   { "source": "WHATSAPP", "message": "Hi, I'm Asha from ... need 10 units ..." }
 *
 * It extracts the lead, logs+analyses the message, scores it, and auto-assigns —
 * zero manual data entry. (No auth here so external services can call it; in
 * production gate this with a shared secret / signature check.)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message: string = body.message ?? "";
    const source = (body.source ?? "WEBSITE") as LeadSource;
    if (!message.trim()) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const [{ data: extracted }, { data: analysis }] = await Promise.all([
      extractLead(message, source),
      analyzeConversation(message),
    ]);

    // auto-assign to least-loaded sales user
    const salesUsers = await prisma.user.findMany({
      where: { role: { in: ["SALES", "MANAGER"] }, isActive: true },
      select: { id: true, _count: { select: { ownedLeads: { where: { status: { notIn: ["WON", "LOST"] } } } } } },
    });
    salesUsers.sort((a, b) => a._count.ownedLeads - b._count.ownedLeads);
    const ownerId = salesUsers[0]?.id ?? null;

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
        intent: analysis.intent,
        urgency: analysis.urgency,
        activities: {
          create: {
            channel: source === "EMAIL" ? "EMAIL" : "WHATSAPP",
            direction: "INBOUND",
            content: message,
            sentiment: analysis.sentiment,
            intentScore: analysis.intent,
          },
        },
      },
    });

    const { data: s } = await scoreLead({
      name: lead.name, company: lead.company, email: lead.email, phone: lead.phone,
      productRequirement: lead.productRequirement, estimatedValue: 0,
      source: lead.source, status: lead.status,
    });
    await prisma.lead.update({
      where: { id: lead.id },
      data: { score: s.score, closingProbability: s.closingProbability },
    });

    const steps = await runNewLeadWorkflow(lead.id);

    return NextResponse.json({ ok: true, leadId: lead.id, extracted, analysis, workflow: steps });
  } catch (err) {
    console.error("[webhook] error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
