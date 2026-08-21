"use client";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function EvmSCurveChart({ series, size = "full" }: { series: { month: string; pv: number; ev: number; ac: number }[]; size?: "full" | "mini" }) {
  if (!series.length) return <p className="text-center text-sm text-slate-400">Pas encore de donnees pour la courbe en S.</p>;
  return <div style={{ height: size === "full" ? 320 : 160 }}>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={series}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} width={size === "full" ? 60 : 40} />
        <Tooltip formatter={(value: number) => value.toLocaleString("fr-FR")} />
        {size === "full" && <Legend />}
        <Line type="monotone" dataKey="pv" name="Planned Value" stroke="#94a3b8" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="ev" name="Earned Value" stroke="#1f7a55" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="ac" name="Actual Cost" stroke="#e87d3e" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>;
}
