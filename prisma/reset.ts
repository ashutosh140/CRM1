/**
 * Reset script — wipes ALL business/demo data but KEEPS login users and
 * pipeline stages, so you have a clean, empty CRM ready for real data.
 *
 * Run:  npx tsx prisma/reset.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Clearing demo data…");
  await prisma.$transaction([
    prisma.activity.deleteMany(),
    prisma.aiInsight.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.quotation.deleteMany(),
    prisma.task.deleteMany(),
    prisma.performance.deleteMany(),
    prisma.meeting.deleteMany(),
    prisma.lead.deleteMany(),
    prisma.customer.deleteMany(),
  ]);
  const users = await prisma.user.count();
  const stages = await prisma.pipelineStage.count();
  console.log(`✅ Done. Kept ${users} login users and ${stages} pipeline stages.`);
  console.log("   Business data (leads, customers, quotes, invoices, tasks, etc.) is now empty.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
