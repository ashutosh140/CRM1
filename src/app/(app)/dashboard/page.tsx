import Link from "next/link";
import {
  Users, Trophy, Wallet, KanbanSquare, Flame, ArrowRight,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardStats, getMonthlyRevenue } from "@/lib/queries";
import { StatCard, Card, PageHeader, Badge } from "@/components/ui";
import { RevenueChart } from "@/components/RevenueChart";
import { formatCurrency } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const [stats, monthly] = await Promise.all([
    getDashboardStats(),
    getMonthlyRevenue(),
  ]);

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.name.split(" ")[0]} 👋`}
        subtitle="Real-time business overview, predictions, and AI recommendations."
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Leads" value={stats.totalLeads} sub={`${stats.openLeads} open`} icon={<Users size={20} />} />
        <StatCard label="Win Rate" value={`${stats.winRate}%`} sub={`${stats.wonLeads} won`} icon={<Trophy size={20} />} accent="green" />
        <StatCard label="Pipeline Value" value={formatCurrency(stats.pipelineValue)} sub="open deals" icon={<KanbanSquare size={20} />} accent="amber" />
        <StatCard label="Revenue Collected" value={formatCurrency(stats.revenue)} sub={`${formatCurrency(stats.outstanding)} outstanding`} icon={<Wallet size={20} />} accent="brand" />
      </div>

      {/* Revenue chart (full width) */}
      <Card className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Revenue Trend</h2>
          <span className="text-xs text-slate-400">Last 6 months</span>
        </div>
        <RevenueChart data={monthly} />
      </Card>

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
