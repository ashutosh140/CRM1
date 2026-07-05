import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { leadScope } from "@/lib/scope";
import { PageHeader, EmptyState } from "@/components/ui";
import { PipelineBoard } from "@/components/PipelineBoard";

export default async function PipelinePage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const [stages, leads] = await Promise.all([
    prisma.pipelineStage.findMany({ orderBy: { order: "asc" } }),
    prisma.lead.findMany({
      where: { ...leadScope(me), status: { notIn: ["WON", "LOST"] } },
      include: { owner: { select: { name: true } } },
      orderBy: { score: "desc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Sales Pipeline"
        subtitle="Drag leads across stages. Each stage carries a default win probability."
      />
      {stages.length === 0 ? (
        <EmptyState message="No pipeline stages. Run the seed script to create default stages." />
      ) : (
        <PipelineBoard
          stages={stages.map((s) => ({ id: s.id, name: s.name, color: s.color, probability: s.probability }))}
          leads={leads.map((l) => ({
            id: l.id, name: l.name, company: l.company,
            estimatedValue: l.estimatedValue, score: l.score, stageId: l.stageId, owner: l.owner,
          }))}
        />
      )}
    </div>
  );
}
