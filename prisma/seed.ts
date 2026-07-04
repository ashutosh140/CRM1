import { PrismaClient, type LeadStatus, type LeadSource } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding AI CRM…");

  // ── wipe (dev only) ──
  await prisma.$transaction([
    prisma.clientReport.deleteMany(),
    prisma.message.deleteMany(),
    prisma.groupMember.deleteMany(),
    prisma.group.deleteMany(),
    prisma.meeting.deleteMany(),
    prisma.activity.deleteMany(),
    prisma.aiInsight.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.quotation.deleteMany(),
    prisma.task.deleteMany(),
    prisma.performance.deleteMany(),
    prisma.lead.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.pipelineStage.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const hash = (p: string) => bcrypt.hash(p, 10);

  // ── Users ──
  const admin = await prisma.user.create({
    data: { name: "Aarav Mehta", email: "admin@aicrm.app", role: "ADMIN", passwordHash: await hash("admin123") },
  });
  const manager = await prisma.user.create({
    data: { name: "Neha Kapoor", email: "manager@aicrm.app", role: "MANAGER", passwordHash: await hash("manager123") },
  });
  const sales1 = await prisma.user.create({
    data: { name: "Rohan Verma", email: "sales@aicrm.app", role: "SALES", passwordHash: await hash("sales123") },
  });
  const sales2 = await prisma.user.create({
    data: { name: "Priya Singh", email: "priya@aicrm.app", role: "SALES", passwordHash: await hash("sales123") },
  });
  await prisma.user.create({
    data: { name: "Karan Das", email: "employee@aicrm.app", role: "EMPLOYEE", passwordHash: await hash("emp123") },
  });
  const salesTeam = [sales1, sales2, manager];

  // ── Pipeline stages ──
  const stageDefs = [
    { name: "New", order: 1, probability: 10, color: "#94a3b8" },
    { name: "Contacted", order: 2, probability: 25, color: "#60a5fa" },
    { name: "Qualified", order: 3, probability: 45, color: "#818cf8" },
    { name: "Proposal", order: 4, probability: 65, color: "#a78bfa" },
    { name: "Negotiation", order: 5, probability: 80, color: "#fbbf24" },
  ];
  const stages = [];
  for (const s of stageDefs) stages.push(await prisma.pipelineStage.create({ data: s }));

  // ── Customers ──
  const customerData = [
    { name: "Zenith Interiors", company: "Zenith Interiors Pvt Ltd", email: "ops@zenith.in", phone: "+91 98200 11223", healthScore: 82, lifetimeValue: 450000, tags: ["VIP", "Repeat"] },
    { name: "BlueOak Realty", company: "BlueOak Realty", email: "hello@blueoak.in", phone: "+91 99300 44556", healthScore: 64, lifetimeValue: 220000, tags: ["Realty"] },
    { name: "Spice Route Foods", company: "Spice Route Foods", email: "buy@spiceroute.in", phone: "+91 98765 77889", healthScore: 35, lifetimeValue: 90000, tags: ["At-risk"] },
    { name: "Nimbus Tech", company: "Nimbus Technologies", email: "purchase@nimbus.io", phone: "+91 90080 33445", healthScore: 28, lifetimeValue: 60000, tags: ["At-risk"] },
    { name: "GreenLeaf Pharma", company: "GreenLeaf Pharma", email: "scm@greenleaf.in", phone: "+91 97000 22110", healthScore: 71, lifetimeValue: 310000, tags: ["Pharma"] },
  ];
  const customers = [];
  for (let i = 0; i < customerData.length; i++) {
    customers.push(await prisma.customer.create({
      data: { ...customerData[i], ownerId: salesTeam[i % salesTeam.length].id },
    }));
  }

  // Sample conversation history per customer (so AI reports have context)
  const convos: Record<number, Array<{ dir: "INBOUND" | "OUTBOUND"; ch: "WHATSAPP" | "EMAIL" | "CALL"; text: string; sentiment: string }>> = {
    0: [
      { dir: "INBOUND", ch: "WHATSAPP", text: "Loved the last batch of modular units. Planning a bigger order for our Pune project.", sentiment: "positive" },
      { dir: "OUTBOUND", ch: "EMAIL", text: "Thanks! Sharing a volume-discount proposal for 20+ units.", sentiment: "positive" },
      { dir: "INBOUND", ch: "CALL", text: "Discussed timelines — they need delivery within 3 weeks. Budget approved.", sentiment: "positive" },
    ],
    2: [
      { dir: "OUTBOUND", ch: "EMAIL", text: "Following up on your renewal — haven't heard back in a while.", sentiment: "neutral" },
      { dir: "INBOUND", ch: "WHATSAPP", text: "Sorry, been busy. Pricing feels a bit high vs a competitor.", sentiment: "negative" },
    ],
    3: [
      { dir: "OUTBOUND", ch: "CALL", text: "Left a voicemail about the pending support renewal.", sentiment: "neutral" },
      { dir: "INBOUND", ch: "EMAIL", text: "We are evaluating other vendors this quarter.", sentiment: "negative" },
    ],
    4: [
      { dir: "INBOUND", ch: "EMAIL", text: "The support team has been excellent. Interested in the premium tier.", sentiment: "positive" },
      { dir: "OUTBOUND", ch: "WHATSAPP", text: "Great to hear! Sending premium-tier details and an upgrade offer.", sentiment: "positive" },
    ],
  };
  for (const [idx, msgs] of Object.entries(convos)) {
    const c = customers[Number(idx)];
    for (let k = 0; k < msgs.length; k++) {
      const m = msgs[k];
      await prisma.activity.create({
        data: {
          customerId: c.id, channel: m.ch, direction: m.dir, content: m.text,
          sentiment: m.sentiment, userId: c.ownerId,
          createdAt: new Date(Date.now() - (msgs.length - k) * 3 * 86400000),
        },
      });
    }
  }

  // ── Leads ──
  const leadSeed: Array<{
    name: string; company: string; email: string; phone: string;
    source: LeadSource; status: LeadStatus; value: number; req: string;
    score: number; intent: number; urgency: number; close: number; stageIdx: number;
  }> = [
    { name: "Asha Rao", company: "Mango Studios", email: "asha@mango.in", phone: "+91 98111 23456", source: "WHATSAPP", status: "NEW", value: 120000, req: "Branding package for 3 products", score: 78, intent: 72, urgency: 60, close: 55, stageIdx: 0 },
    { name: "Vikram Joshi", company: "Joshi Motors", email: "vikram@joshimotors.in", phone: "+91 99220 88776", source: "WEBSITE", status: "CONTACTED", value: 340000, req: "CRM software for 25-seat dealership", score: 88, intent: 84, urgency: 70, close: 72, stageIdx: 1 },
    { name: "Fatima Sheikh", company: "Crescent Exports", email: "fatima@crescent.in", phone: "+91 98330 55443", source: "REFERRAL", status: "QUALIFIED", value: 560000, req: "Annual maintenance + 50 licenses", score: 91, intent: 88, urgency: 75, close: 80, stageIdx: 2 },
    { name: "Daniel Thomas", company: "Coastal Logistics", email: "daniel@coastal.in", phone: "+91 90011 66554", source: "EMAIL", status: "PROPOSAL", value: 280000, req: "Fleet tracking integration", score: 74, intent: 70, urgency: 50, close: 62, stageIdx: 3 },
    { name: "Sneha Gupta", company: "Lotus Boutique", email: "sneha@lotus.in", phone: "+91 98445 11990", source: "INSTAGRAM", status: "NEGOTIATION", value: 95000, req: "POS + inventory module", score: 69, intent: 76, urgency: 65, close: 58, stageIdx: 4 },
    { name: "Imran Khan", company: "Skyline Builders", email: "imran@skyline.in", phone: "+91 99888 22334", source: "FACEBOOK", status: "WON", value: 700000, req: "Enterprise rollout", score: 95, intent: 92, urgency: 80, close: 100, stageIdx: 2 },
    { name: "Pooja Nair", company: "Bright Minds", email: "pooja@brightminds.in", phone: "+91 98220 99001", source: "WEBSITE", status: "LOST", value: 150000, req: "Went with competitor", score: 40, intent: 30, urgency: 20, close: 0, stageIdx: 1 },
    { name: "Arjun Reddy", company: "Reddy Agro", email: "arjun@reddyagro.in", phone: "+91 90900 44556", source: "PHONE", status: "NEW", value: 210000, req: "Supply chain module", score: 66, intent: 60, urgency: 45, close: 48, stageIdx: 0 },
  ];

  for (let i = 0; i < leadSeed.length; i++) {
    const l = leadSeed[i];
    await prisma.lead.create({
      data: {
        name: l.name, company: l.company, email: l.email, phone: l.phone,
        source: l.source, status: l.status, estimatedValue: l.value, productRequirement: l.req,
        score: l.score, intent: l.intent, urgency: l.urgency, closingProbability: l.close,
        ownerId: salesTeam[i % salesTeam.length].id,
        stageId: stages[l.stageIdx]?.id,
        lastContactedAt: new Date(Date.now() - (i + 1) * 86400000),
        customerId: l.status === "WON" ? customers[0].id : undefined,
        activities: {
          create: [{
            channel: l.source === "EMAIL" ? "EMAIL" : "WHATSAPP",
            direction: "INBOUND",
            content: `Inbound: ${l.req}`,
            sentiment: l.intent > 60 ? "positive" : "neutral",
            intentScore: l.intent,
          }],
        },
      },
    });
  }

  // ── Quotations & Invoices ──
  const q1 = await prisma.quotation.create({
    data: {
      number: "QT-100001", customerId: customers[0].id, status: "ACCEPTED",
      items: [{ description: "AI CRM — Annual License (25 users)", qty: 25, unitPrice: 12000 }],
      subtotal: 300000, taxRate: 18, taxAmount: 54000, total: 354000,
      createdById: sales1.id,
    },
  });
  await prisma.invoice.create({
    data: {
      number: "INV-100001", customerId: customers[0].id, quotationId: q1.id, status: "PAID",
      items: q1.items as object, subtotal: 300000, taxAmount: 54000, total: 354000, paidAmount: 354000,
      dueDate: new Date(),
    },
  });
  await prisma.quotation.create({
    data: {
      number: "QT-100002", customerId: customers[1].id, status: "SENT",
      items: [{ description: "Implementation & Training", qty: 1, unitPrice: 150000 }],
      subtotal: 150000, taxRate: 18, taxAmount: 27000, total: 177000, createdById: sales2.id,
    },
  });
  await prisma.invoice.create({
    data: {
      number: "INV-100002", customerId: customers[4].id, status: "PARTIAL",
      items: [{ description: "Support Retainer", qty: 6, unitPrice: 20000 }],
      subtotal: 120000, taxAmount: 21600, total: 141600, paidAmount: 70000,
      dueDate: new Date(Date.now() + 10 * 86400000),
    },
  });

  // ── Tasks ──
  await prisma.task.createMany({
    data: [
      { title: "Call Vikram Joshi for demo", priority: "HIGH", assigneeId: sales1.id, creatorId: manager.id, status: "TODO" },
      { title: "Send proposal to Coastal Logistics", priority: "URGENT", assigneeId: sales2.id, creatorId: manager.id, status: "IN_PROGRESS" },
      { title: "Win-back offer for Nimbus Tech", priority: "MEDIUM", assigneeId: sales1.id, creatorId: admin.id, status: "TODO" },
      { title: "Onboard Skyline Builders", priority: "HIGH", assigneeId: manager.id, creatorId: admin.id, status: "DONE" },
    ],
  });

  // ── Performance (Employee AI Scores) for current month ──
  const period = new Date().toISOString().slice(0, 7);
  const perf = [
    { user: sales1, productivity: 88, salesScore: 82, responseTime: 90, satisfaction: 86, revenue: 354000 },
    { user: sales2, productivity: 79, salesScore: 74, responseTime: 81, satisfaction: 80, revenue: 177000 },
    { user: manager, productivity: 92, salesScore: 90, responseTime: 88, satisfaction: 91, revenue: 700000 },
  ];
  for (const p of perf) {
    const { user, ...metrics } = p;
    const overall = Math.round((metrics.productivity + metrics.salesScore + metrics.responseTime + metrics.satisfaction) / 4);
    await prisma.performance.create({
      data: { userId: user.id, period, ...metrics, overall },
    });
  }

  console.log("✅ Seed complete!");
  console.log("   Admin:   admin@aicrm.app / admin123");
  console.log("   Manager: manager@aicrm.app / manager123");
  console.log("   Sales:   sales@aicrm.app / sales123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
