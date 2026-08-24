"use client";
import Link from "next/link";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { EvmMetrics } from "@/lib/ppm/types";

export type ProjectEvmRow = { projectId: string; projectName: string; metrics: EvmMetrics };

export default function PortfolioProgramEvmRollup({ rollup, rows, excludedCount }: {
  rollup: EvmMetrics | null; rows: ProjectEvmRow[]; excludedCount: number;
}) {
  const { en } = usePpmLocale();
  if (!rollup) return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-400">
    {en ? "Earned Value Management unavailable: no linked project has EVM enabled." : "Earned Value Management non disponible : aucun projet rattache n'a l'EVM active."}
  </div>;

  return <div className="grid gap-4 rounded-2xl border bg-white p-6">
    <h2 className="text-lg font-black text-forest">{en ? "Performance (Earned Value Management)" : "Performance (Earned Value Management)"}</h2>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div><p className="text-xs font-bold uppercase text-slate-400">BAC</p><b className="mt-1 block text-xl text-forest">{rollup.bac.toLocaleString(en ? "en-US" : "fr-FR", { maximumFractionDigits: 0 })}</b></div>
      <div><p className="text-xs font-bold uppercase text-slate-400">EV / AC</p><b className="mt-1 block text-xl text-forest">{rollup.ev.toLocaleString(en ? "en-US" : "fr-FR", { maximumFractionDigits: 0 })} / {rollup.ac.toLocaleString(en ? "en-US" : "fr-FR", { maximumFractionDigits: 0 })}</b></div>
      <div><p className="text-xs font-bold uppercase text-slate-400">SPI</p><b className="mt-1 block text-xl text-forest">{rollup.spi != null ? rollup.spi.toFixed(2) : "—"}</b></div>
      <div><p className="text-xs font-bold uppercase text-slate-400">CPI</p><b className="mt-1 block text-xl text-forest">{rollup.cpi != null ? rollup.cpi.toFixed(2) : "—"}</b></div>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">{en ? "Project" : "Projet"}</th><th className="p-3">BAC</th><th className="p-3">EV</th><th className="p-3">AC</th><th className="p-3">SPI</th><th className="p-3">CPI</th><th className="p-3">{en ? "Detail" : "Detail"}</th></tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.projectId} className="border-t">
            <td className="p-3 font-bold text-forest">{row.projectName}</td>
            <td className="p-3">{row.metrics.bac.toLocaleString(en ? "en-US" : "fr-FR", { maximumFractionDigits: 0 })}</td>
            <td className="p-3">{row.metrics.ev.toLocaleString(en ? "en-US" : "fr-FR", { maximumFractionDigits: 0 })}</td>
            <td className="p-3">{row.metrics.ac.toLocaleString(en ? "en-US" : "fr-FR", { maximumFractionDigits: 0 })}</td>
            <td className="p-3">{row.metrics.spi != null ? row.metrics.spi.toFixed(2) : "—"}</td>
            <td className="p-3">{row.metrics.cpi != null ? row.metrics.cpi.toFixed(2) : "—"}</td>
            <td className="p-3"><Link href={`/op-management/projets/${row.projectId}/suivi-controle/performance`} className="text-xs font-bold text-leaf">{en ? "View →" : "Voir →"}</Link></td>
          </tr>)}
        </tbody>
      </table>
    </div>
    {excludedCount > 0 && <p className="text-xs text-slate-400">{excludedCount} {en ? "project(s) without active EVM not included in this total." : "projet(s) sans EVM active non inclus dans ce total."}</p>}
  </div>;
}
