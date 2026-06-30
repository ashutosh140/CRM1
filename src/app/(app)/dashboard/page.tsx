import Link from "next/link";
import {
  Users, Trophy, Wallet, KanbanSquare, Sparkles, Flame, ArrowRight,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardStats, getMonthlyRevenue } from "@/lib/queries";
import { businessInsights, aiEnabled } from "@/lib/ai";
import { StatCard, Card, PageHeader, ScoreBar, Badge } from "@/components/ui";
import { RevenueChart } from "@/components/RevenueChart";
import { formatCurrency } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const [stats, monthly] = await Promise.all([
    getDashboardStats(),
    getMonthlyRevenue(),
  ]);

  const { data: insightData, mocked } = await businessInsights({
    totalLeads: stats.totalLeads,
    openLeads: stats.openLeads,
    winRate: stats.winRate,
    pipelineValue: stats.pipelineValue,
    pendingTasks: stats.pendingTasks,
    revenue: stats.revenue,
  });

  return (
    <div>
      <PageHeader
        title={`Namaste, ${user?.name.split(" ")[0]} 👋`}
        subtitle="Real-time business overview, predictions, and AI recommendations."
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Leads" value={stats.totalLeads} sub={`${stats.openLeads} open`} icon={<Users size={20} />} />
        <StatCard label="Win Rate" value={`${stats.winRate}%`} sub={`${stats.wonLeads} won`} icon={<Trophy size={20} />} accent="green" />
        <StatCard label="Pipeline Value" value={formatCurrency(stats.pipelineValue)} sub="open deals" icon={<KanbanSquare size={20} />} accent="amber" />
        <StatCard label="Revenue Collected" value={formatCurrency(stats.revenue)} sub={`${formatCurrency(stats.outstanding)} outstanding`} icon={<Wallet size={20} />} accent="brand" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue chart */}
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Revenue Trend</h2>
            <span className="text-xs text-slate-400">Last 6 months</span>
          </div>
          <RevenueChart data={monthly} />
        </Card>

        {/* AI Business Assistant */}
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <Sparkles size={18} className="text-brand-600" />
            <h2 className="font-semibold text-slate-900">AI Business Assistant</h2>
          </div>
          {!aiEnabled && (
            <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Mock mode — add <code>OPENAI_API_KEY</code> for live AI insights.
            </p>
          )}
          <ul className="space-y-3">
            {insightData.insights.map((ins, i) => (
              <li key={i} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                <p className="text-sm font-medium text-slate-800">{ins.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{ins.body}</p>
              </li>
            ))}
          </ul>
          {!mocked && (
            <p className="mt-3 text-[10px] text-slate-400">Generated live by OpenAI.</p>
          )}
        </Card>
      </div>

      {/* Hot leads */}
      <Card className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame size={18} className="text-rose-500" />
            <h2 className="font-semibold text-slate-900">Hottest Leads</h2>
          </div>
          <Link href="/leads" className="flex items-center gap-1 text-sm text-brand-600 hover:underline">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {stats.hotLeads.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No leads yet. Seed the database or capture one.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                  <th className="pb-2 font-medium">Lead</th>
                  <th className="pb-2 font-medium">Owner</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Value</th>
                  <th className="pb-2 font-medium">AI Score</th>
                </tr>
              </thead>
              <tbody>
                {stats.hotLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-3">
                      <Link href={`/leads/${lead.id}`} className="font-medium text-slate-800 hover:text-brand-600">
                        {lead.name}
                      </Link>
                      <p className="text-xs text-slate-400">{lead.company ?? "—"}</p>
                    </td>
                    <td className="py-3 text-slate-600">{lead.owner?.name ?? "Unassigned"}</td>
                    <td className="py-3"><Badge value={lead.status} /></td>
                    <td className="py-3 text-slate-600">{formatCurrency(lead.estimatedValue)}</td>
                    <td className="py-3"><ScoreBar value={lead.score} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
