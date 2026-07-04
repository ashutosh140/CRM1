"use client";

import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export function RevenueChart({
  data,
}: {
  data: { month: string; revenue: number; billed: number }[];
}) {
  const fmt = (v: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* clean axes only — no grid, no dashes */}
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={{ stroke: "#cbd5e1" }}
          padding={{ left: 8, right: 8 }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          width={52}
          tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
        />

        <Tooltip
          formatter={(v: number, name) => [fmt(v), name === "revenue" ? "Collected" : "Billed"]}
          contentStyle={{
            borderRadius: 10, border: "1px solid #e2e8f0",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: 12,
          }}
        />

        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#6366f1"
          strokeWidth={2.5}
          fill="url(#rev)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff", fill: "#6366f1" }}
          name="revenue"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
