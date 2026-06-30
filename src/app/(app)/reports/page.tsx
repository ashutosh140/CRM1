import { TrendingUp, Users, AlertTriangle, Trophy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getMonthlyRevenue } from "@/lib/queries";
import { Card, PageHeader, StatCard, ScoreBar, Badge } from "@/components/ui";
import { FunnelChart } from "@/components/FunnelChart";
import { formatCurrency, initials } from "@/lib/utils";

const STATUS_ORDER = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];

/** Naive linear projection from the last 6 months of collected revenue. */
function forecastNextMonth(series: number[]) {
  const n = series.length;
  if (n < 2) return series[n - 1] ?? 0;
  const avgGrowth =
    series.slice(1).reduce((acc, v, i) => acc + (v - series[i]), 0) / (n - 1);
  return Math.max(0, Math.round(series[n - 1] + avgGrowth));
}

export default async function ReportsPage() {
  const [monthly, funnelGroups, performances, atRisk, openPipeline] = await Promise.all([
    getMonthlyRevenue(),
    prisma.lead.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.performance.findMany({
      orderBy: { overall: "desc" },
      include: { user: { select: { name: true, role: true } } },
      take: 8,
    }),
    prisma.customer.findMany({
      where: { healthScore: { lt: 40 } },
      orderBy: { healthScore: "asc" },
      take: 6,
    }),
    prisma.lead.aggregate({
      where: { status: { notIn: ["WON", "LOST"] } },
      _sum: { estimatedValue: true },
    }),
  ]);

  const revenueSeries = monthly.map((m) => m.revenue);
  const forecast = forecastNextMonth(revenueSeries);
  const weightedPipeline = openPipeline._sum.estimatedValue ?? 0;

  const funnel = STATUS_ORDER.map((s) => ({
    stage: s,
    count: funnelGroups.find((g) => g.status === s)?._count._all ?? 0,
  }));

  return (
    <div>
      <PageHeader
        title="Reports & AI Predictions"
        subtitle="Predictive dashboard — forecasts, employee AI scores, churn risk."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Forecast — Next Month" value={formatCurrency(forecast)} sub="AI revenue projection" icon={<TrendingUp size={20} />} accent="brand" />
        <StatCard label="Open Pipeline Value" value={formatCurrency(weightedPipeline)} sub="expected sales" icon={<Users size={20} />} accent="amber" />
        <StatCard label="At-Risk Customers" value={atRisk.length} sub="health < 40" icon={<AlertTriangle size={20} />} accent="rose" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold text-slate-900">Lead Funnel</h2>
          <FunnelChart data={funnel} />
        </Card>

        <Card>
          <div className="mb-3 flex items-center gap-2">
            <Trophy size={18} className="text-amber-500" />
            <h2 className="font-semibold text-slate-900">Employee AI Scores</h2>
          </div>
          {performances.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No performance data. Seed to populate.</p>
          ) : (
            <ul className="space-y-3">
              {performances.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3">
                  <span className="w-5 text-sm font-bold text-slate-400">{i + 1}</span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                    {initials(p.user.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">{p.user.name}</p>
                    <ScoreBar value={p.overall} />
                  </div>
                  <span className="text-xs text-slate-400">{formatCurrency(p.revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle size={18} className="text-rose-500" />
          <h2 className="font-semibold text-slate-900">Lost Customer Recovery — AI Targets</h2>
        </div>
        {atRisk.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">No at-risk customers. 🎉</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {atRisk.map((c) => (
              <div key={c.id} className="rounded-lg border border-rose-100 bg-rose-50/40 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-800">{c.name}</p>
                  <Badge value="negative" />
                </div>
                <div className="mt-2"><ScoreBar value={c.healthScore} /></div>
                <p className="mt-2 text-xs text-slate-500">AI: send a win-back offer + schedule a personal call.</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
