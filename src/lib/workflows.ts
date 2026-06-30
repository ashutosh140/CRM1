/**
 * Autonomous Workflow Engine.
 *
 * When a new lead arrives, the system automatically runs a chain of actions
 * (welcome email → follow-up task → manager alert) with no manual setup —
 * the "AI employee" behaviour from the brief.
 */
import { prisma } from "./prisma";
import { draftEmail } from "./ai";
import { sendEmail, emailTemplate } from "./email";

export async function runNewLeadWorkflow(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { owner: true },
  });
  if (!lead) return;

  const steps: string[] = [];

  // 1) Welcome email (if we have an address)
  if (lead.email) {
    const { data: draft } = await draftEmail({
      purpose: "Welcome a new inbound lead and offer to help",
      name: lead.name,
      company: lead.company,
      context: lead.productRequirement
        ? `They are interested in: ${lead.productRequirement}.`
        : undefined,
    });
    const res = await sendEmail({
      to: lead.email,
      toName: lead.name,
      subject: draft.subject,
      html: emailTemplate({ title: draft.subject, body: draft.body }),
    });
    await prisma.activity.create({
      data: {
        channel: "EMAIL", direction: "OUTBOUND", leadId: lead.id,
        subject: draft.subject,
        content: res.mocked ? `[MOCK] Welcome email to ${lead.email}` : `Welcome email sent to ${lead.email}`,
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
