"use client";

import {
  Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell,
} from "recharts";

const COLORS = ["#94a3b8", "#60a5fa", "#818cf8", "#a78bfa", "#fbbf24", "#34d399", "#f87171"];

export function FunnelChart({ data }: { data: { stage: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
        <XAxis type="number" tick={{ fontSize: 12, fill: "#94a3b8" }} />
        <YAxis type="category" dataKey="stage" width={90} tick={{ fontSize: 12, fill: "#64748b" }} />
        <Tooltip />
        <Bar dataKey="count" radius={[0, 6, 6, 0]}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
