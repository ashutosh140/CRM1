/**
 * Autonomous Workflow Engine.
 *
 * When a new lead arrives, the system automatically runs a chain of actions
 * (welcome email → follow-up task → manager alert) with no manual setup —
 * the "AI employee" behaviour from the brief.
 */
import { prisma } from "./prisma";
import { sendEmail, emailTemplate } from "./email";
import { generateWelcomePdf } from "./pdf";

interface LeadLike {
  name: string; company?: string | null; email?: string | null; phone?: string | null;
  productRequirement?: string | null; contractMonths?: number | null; onboardedAt?: Date | null;
}

/** Sends a polished, professional welcome email with an onboarding PDF attached. */
export async function sendWelcomeEmail(lead: LeadLike) {
  if (!lead.email) return { ok: false, mocked: true };

  const pdf = await generateWelcomePdf({
    name: lead.name, company: lead.company, email: lead.email, phone: lead.phone,
    requirement: lead.productRequirement, contractMonths: lead.contractMonths, onboardedAt: lead.onboardedAt,
  });

  const subject = `Welcome to AI CRM, ${lead.name}! 🎉`;
  const body =
    `Dear ${lead.name},\n\n` +
    `Thank you so much for the opportunity to work with ${lead.company ?? "you"}. ` +
    `It is a genuine pleasure to welcome you on board, and we are excited to begin this journey together.\n\n` +
    `We have attached a short onboarding document (PDF) that outlines our process, your engagement details, ` +
    `and what to expect in the coming days. Our team is already preparing to give you a smooth, first-class experience.\n\n` +
    `If there is anything you need at any point, please do not hesitate to reach out — we are always here to help.\n\n` +
    `Once again, thank you for trusting us. We look forward to delivering great results for you.`;

  return sendEmail({
    to: lead.email,
    toName: lead.name,
    subject,
    html: emailTemplate({ title: `Welcome aboard, ${lead.name}!`, body }),
    attachments: [{ name: "Welcome-Onboarding.pdf", contentBase64: pdf }],
  });
}

export async function runNewLeadWorkflow(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { owner: true },
  });
  if (!lead) return;

  const steps: string[] = [];

  // 1) Professional welcome email with an onboarding PDF attachment
  if (lead.email) {
    const res = await sendWelcomeEmail(lead);
    await prisma.activity.create({
      data: {
        channel: "EMAIL", direction: "OUTBOUND", leadId: lead.id,
        subject: `Welcome to AI CRM, ${lead.name}!`,
        content: res.mocked ? `[MOCK] Welcome email + PDF to ${lead.email}` : `Welcome email + onboarding PDF sent to ${lead.email}`,
      },
    });
    steps.push(res.mocked ? "welcome-email(mock)" : "welcome-email");
  }

  // 2) Auto follow-up task for the assigned owner
  await prisma.task.create({
    data: {
      title: `Follow up with ${lead.name}${lead.company ? ` (${lead.company})` : ""}`,
      description: lead.productRequirement ?? "New lead — make first contact.",
      priority: lead.score >= 70 ? "HIGH" : "MEDIUM",
      assigneeId: lead.ownerId,
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    },
  });
  steps.push("followup-task");

  // 3) Manager alert for hot leads
  if (lead.score >= 80) {
    const manager = await prisma.user.findFirst({ where: { role: "MANAGER", isActive: true } });
    if (manager) {
      await prisma.aiInsight.create({
        data: {
          type: "RECOMMENDATION",
          title: `🔥 Hot lead: ${lead.name}`,
          body: `Score ${lead.score}. Auto-assigned to ${lead.owner?.name ?? "unassigned"}. Consider prioritising.`,
          score: lead.score,
          leadId: lead.id,
        },
      });
      steps.push("manager-alert");
    }
  }

  return steps;
}
