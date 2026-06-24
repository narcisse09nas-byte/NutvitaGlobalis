"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Insight = Record<string, any>;

export default function InsightPanel({ initial, alerts, reports }: { initial: Insight | null; alerts: Insight[]; reports: Insight[] }) {
  const [insight, setInsight] = useState(initial);
  const [items, setItems] = useState(alerts);
  const [reportItems, setReports] = useState(reports);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function analyze() {
    setLoading(true);
    const response = await fetch("/api/health/analyze", { method: "POST" });
    const result = await response.json();
    if (response.ok) {
      setInsight({
        public_summary: result.publicSummary,
        professional_summary: result.professionalSummary,
        trends: result.trends,
        improvements: result.improvements,
        risks: result.risks,
        recommendations: result.recommendations,
        indicatorInsights: result.indicatorInsights,
        publicConclusion: result.publicConclusion,
        professionalConclusion: result.professionalConclusion,
        created_at: new Date().toISOString(),
      });
      setItems([...result.alerts.map((alert: Insight) => ({ ...alert, id: crypto.randomUUID(), created_at: new Date().toISOString() })), ...items]);
      setMessage("Analyse actualisee.");
    } else setMessage(result.message);
    setLoading(false);
  }

  async function report() {
    setLoading(true);
    const response = await fetch("/api/health/report", { method: "POST" });
    const result = await response.json();
    if (response.ok) {
      setReports([result, ...reportItems]);
      setMessage("Rapport PDF genere.");
    } else setMessage(result.message);
    setLoading(false);
  }

  async function open(path: string) {
    const { data, error } = await createClient().storage.from("document-vault").createSignedUrl(path, 180);
    if (error) setMessage(error.message);
    else window.open(data.signedUrl, "_blank");
  }

  const indicatorInsights = insight?.indicatorInsights || insight?.indicator_insights || [];
  const publicConclusion = insight?.publicConclusion || insight?.public_conclusion;
  const professionalConclusion = insight?.professionalConclusion || insight?.professional_conclusion;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap gap-3">
        <button onClick={analyze} disabled={loading} className="btn-primary">{loading ? "Analyse..." : "Actualiser mon analyse"}</button>
        <button onClick={report} disabled={loading} className="btn-secondary">Generer un rapport PDF</button>
      </div>
      {message && <p className="rounded-xl bg-mint p-4 font-bold text-forest">{message}</p>}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border bg-white p-6">
          <p className="text-xs font-bold uppercase text-leaf">Pour vous</p>
          <h2 className="mt-2 text-xl font-black">Resume accessible</h2>
          <p className="mt-4 leading-7 text-slate-600">{insight?.public_summary || "Lancez une analyse apres avoir ajoute au moins deux mesures."}</p>
        </section>
        <section className="rounded-2xl border bg-white p-6">
          <p className="text-xs font-bold uppercase text-slate-400">Version professionnelle</p>
          <h2 className="mt-2 text-xl font-black">Resume clinique</h2>
          <p className="mt-4 leading-7 text-slate-600">{insight?.professional_summary || "Aucune analyse enregistree."}</p>
        </section>
      </div>

      {indicatorInsights.length > 0 && (
        <section className="rounded-2xl border bg-white p-6">
          <h2 className="text-2xl font-black">Analyse par indicateur</h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {indicatorInsights.map((item: Insight) => (
              <article key={item.indicator} className="rounded-xl bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <b>{item.indicator}{item.latest ? ` - ${item.latest}` : ""}</b>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase text-slate-500">{item.status}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{item.publicInterpretation}</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">{item.professionalInterpretation}</p>
                <p className="mt-3 text-sm font-bold text-forest">{item.recommendation}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {(publicConclusion || professionalConclusion) && (
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border bg-white p-6">
            <h2 className="text-xl font-black">Conclusion grand public</h2>
            <p className="mt-3 leading-7 text-slate-600">{publicConclusion}</p>
          </section>
          <section className="rounded-2xl border bg-white p-6">
            <h2 className="text-xl font-black">Conclusion professionnelle</h2>
            <p className="mt-3 leading-7 text-slate-600">{professionalConclusion}</p>
          </section>
        </div>
      )}

      <section>
        <h2 className="mb-4 text-2xl font-black">Alertes a verifier</h2>
        <div className="grid gap-3">
          {items.map(alert => (
            <article key={alert.id} className={`rounded-2xl border-l-4 bg-white p-5 ${alert.severity === "critical" ? "border-red-500" : alert.severity === "warning" ? "border-orange" : "border-sky-500"}`}>
              <div className="flex justify-between gap-4"><b>{alert.title}</b><span className="text-xs uppercase text-slate-400">{alert.severity}</span></div>
              <p className="mt-2 text-sm text-slate-600">{alert.message}</p>
            </article>
          ))}
          {!items.length && <p className="rounded-2xl bg-white p-6 text-slate-400">Aucune alerte active.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-black">Mes rapports</h2>
        <div className="grid gap-3">
          {reportItems.map(item => (
            <button key={item.id} onClick={() => open(item.file_path)} className="flex justify-between rounded-2xl border bg-white p-5 text-left">
              <span className="font-bold">{item.title}</span>
              <span className="text-leaf">Telecharger</span>
            </button>
          ))}
          {!reportItems.length && <p className="rounded-2xl bg-white p-6 text-slate-400">Aucun rapport genere.</p>}
        </div>
      </section>
      <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Ces analyses sont informatives et ne remplacent ni un diagnostic, ni une consultation, ni une prescription.</p>
    </div>
  );
}
