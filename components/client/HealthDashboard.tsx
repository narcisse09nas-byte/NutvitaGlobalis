"use client";

import { useMemo, useState } from "react";

type Row = Record<string, any>;
type Metric = { key: string; label: string; source: "anthro" | "biology" | "food"; date: string; color: string };
const metrics: Metric[] = [
  { key: "weight_kg", label: "Poids", source: "anthro", date: "measured_at", color: "#18794e" },
  { key: "bmi", label: "IMC", source: "anthro", date: "measured_at", color: "#e97824" },
  { key: "glucose", label: "Glycemie", source: "biology", date: "measured_at", color: "#2684c7" },
  { key: "hba1c", label: "HbA1c", source: "biology", date: "measured_at", color: "#7c3aed" },
  { key: "total_cholesterol", label: "Cholesterol", source: "biology", date: "measured_at", color: "#dc6b19" },
  { key: "systolic_pressure", label: "Pression arterielle", source: "biology", date: "measured_at", color: "#dc2626" },
  { key: "calories", label: "Apports alimentaires", source: "food", date: "entry_date", color: "#65a30d" },
];
const periods = [[7, "7 jours"], [30, "30 jours"], [90, "3 mois"], [180, "6 mois"], [365, "1 an"]] as const;

export default function HealthDashboard({ anthropometry, biology, food }: { anthropometry: Row[]; biology: Row[]; food: Row[] }) {
  const [metricKey, setMetricKey] = useState("weight_kg");
  const [days, setDays] = useState<number | "custom">(90);
  const [chart, setChart] = useState<"line" | "bar" | "radar" | "compare">("line");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const metric = metrics.find(item => item.key === metricKey) || metrics[0];
  const points = useMemo(() => {
    const source = metric.source === "anthro" ? anthropometry : metric.source === "biology" ? biology : food;
    const min = days === "custom" && from ? +new Date(from) : Date.now() - Number(days === "custom" ? 365 : days) * 86400000;
    const max = days === "custom" && to ? +new Date(`${to}T23:59:59`) : Date.now();
    return source.map(row => ({ date: new Date(row[metric.date]), value: Number(metric.source === "food" ? row.content?.calories : row[metric.key]) })).filter(point => Number.isFinite(point.value) && +point.date >= min && +point.date <= max).sort((a, b) => +a.date - +b.date);
  }, [metric, anthropometry, biology, food, days, from, to]);
  return <div className="grid gap-6"><div className="flex flex-wrap gap-3 rounded-2xl border bg-white p-5"><select className="admin-input max-w-xs" value={metricKey} onChange={event => setMetricKey(event.target.value)}>{metrics.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</select><select className="admin-input max-w-[180px]" value={days} onChange={event => setDays(event.target.value === "custom" ? "custom" : Number(event.target.value))}>{periods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}<option value="custom">Personnalise</option></select>{days === "custom" && <><input type="date" className="admin-input max-w-[170px]" value={from} onChange={event => setFrom(event.target.value)} /><input type="date" className="admin-input max-w-[170px]" value={to} onChange={event => setTo(event.target.value)} /></>}<div className="flex flex-wrap gap-2">{(["line", "bar", "radar", "compare"] as const).map(type => <button key={type} onClick={() => setChart(type)} className={`rounded-full px-4 py-2 text-sm font-bold ${chart === type ? "bg-forest text-white" : "bg-slate-100"}`}>{type === "line" ? "Ligne" : type === "bar" ? "Histogramme" : type === "radar" ? "Radar" : "Avant / apres"}</button>)}</div></div><Chart points={points} type={chart} color={metric.color} label={metric.label} /></div>;
}

function Chart({ points, type, color, label }: { points: Array<{ date: Date; value: number }>; type: "line" | "bar" | "radar" | "compare"; color: string; label: string }) {
  if (!points.length) return <div className="rounded-2xl border bg-white p-12 text-center text-slate-400">Aucune donnee pour cette periode.</div>;
  const width = 760, height = 330, pad = 48, values = points.map(point => point.value), min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const x = (index: number) => pad + index * ((width - pad * 2) / Math.max(1, points.length - 1));
  const y = (value: number) => height - pad - (value - min) / span * (height - pad * 2);
  if (type === "compare") return <div className="grid gap-4 rounded-2xl border bg-white p-7 sm:grid-cols-2"><Compare label="Avant" point={points[0]} /><Compare label="Apres" point={points.at(-1)!} /><p className="sm:col-span-2 text-center font-bold text-forest">Evolution: {(points.at(-1)!.value - points[0].value).toFixed(1)}</p></div>;
  if (type === "radar") {
    const centerX = width / 2, centerY = height / 2, radius = 115, sample = points.slice(-6), polygon = sample.map((point, index) => { const angle = -Math.PI / 2 + index * Math.PI * 2 / sample.length; const normalized = .25 + .75 * (point.value - min) / span; return `${centerX + Math.cos(angle) * radius * normalized},${centerY + Math.sin(angle) * radius * normalized}`; }).join(" ");
    return <ChartFrame label={label}><svg viewBox={`0 0 ${width} ${height}`} className="w-full"><circle cx={centerX} cy={centerY} r={radius} fill="none" stroke="#dbe5e1"/><circle cx={centerX} cy={centerY} r={radius / 2} fill="none" stroke="#e9efed"/><polygon points={polygon} fill={`${color}33`} stroke={color} strokeWidth="3"/>{sample.map((point,index)=>{const angle=-Math.PI/2+index*Math.PI*2/sample.length;return <text key={index} x={centerX+Math.cos(angle)*(radius+25)} y={centerY+Math.sin(angle)*(radius+25)} textAnchor="middle" fontSize="11">{point.date.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"})}</text>})}</svg></ChartFrame>;
  }
  const path = points.map((point, index) => `${index ? "L" : "M"}${x(index)},${y(point.value)}`).join(" ");
  return <ChartFrame label={label}><svg viewBox={`0 0 ${width} ${height}`} className="w-full"><line x1={pad} y1={height-pad} x2={width-pad} y2={height-pad} stroke="#cbd5e1"/><line x1={pad} y1={pad} x2={pad} y2={height-pad} stroke="#cbd5e1"/>{type === "line" ? <path d={path} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/> : points.map((point,index)=><rect key={index} x={x(index)-Math.min(18,(width-pad*2)/points.length/3)} y={y(point.value)} width={Math.min(36,(width-pad*2)/points.length*.65)} height={height-pad-y(point.value)} rx="5" fill={color}/>) }{points.map((point,index)=><g key={index}><circle cx={x(index)} cy={y(point.value)} r="5" fill="white" stroke={color} strokeWidth="3"><title>{`${point.date.toLocaleDateString("fr-FR")}: ${point.value}`}</title></circle>{(index===0||index===points.length-1)&&<text x={x(index)} y={height-18} textAnchor="middle" fontSize="11">{point.date.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"})}</text>}</g>)}</svg></ChartFrame>;
}
function ChartFrame({ label, children }: { label: string; children: React.ReactNode }) { return <div className="rounded-2xl border bg-white p-5"><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-black">Evolution - {label}</h2><span className="text-xs text-slate-400">Survolez les points</span></div>{children}</div>; }
function Compare({ label, point }: { label: string; point: { date: Date; value: number } }) { return <div className="rounded-2xl bg-slate-50 p-6 text-center"><p className="text-sm font-bold uppercase text-slate-400">{label}</p><p className="mt-2 text-4xl font-black text-forest">{point.value}</p><p className="mt-2 text-sm">{point.date.toLocaleDateString("fr-FR")}</p></div>; }
