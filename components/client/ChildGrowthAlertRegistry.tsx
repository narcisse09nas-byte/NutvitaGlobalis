"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Row = Record<string, any>;

export default function ChildGrowthAlertRegistry({
  initial,
  locale = "fr",
  canRequestConsultation = false,
}: {
  initial: Row[];
  locale?: "fr" | "en";
  canRequestConsultation?: boolean;
}) {
  const en = locale === "en";
  const t = (fr: string, english: string) => (en ? english : fr);
  const [rows, setRows] = useState(initial);
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("all");
  const [commenting, setCommenting] = useState<Row | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(
    () =>
      rows.filter(
        (row) =>
          (severity === "all" || row.severity === severity) &&
          `${row.title || ""} ${row.message || ""} ${row.parent_comment || ""}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [rows, query, severity],
  );

  async function saveComment() {
    if (!commenting || !comment.trim()) return;
    setBusy(true);
    const payload = {
      parent_comment: comment.trim(),
      parent_commented_at: new Date().toISOString(),
    };
    const { data, error } = await createClient()
      .from("child_growth_alerts")
      .update(payload)
      .eq("id", commenting.id)
      .select()
      .single();
    setBusy(false);
    if (error) return alert(error.message);
    setRows((list) => list.map((row) => (row.id === data.id ? data : row)));
    setCommenting(null);
    setComment("");
  }

  async function requestConsultation(row: Row) {
    if (!canRequestConsultation) return;
    setBusy(true);
    const { data, error } = await createClient()
      .from("child_growth_alerts")
      .update({ consultation_requested_at: new Date().toISOString() })
      .eq("id", row.id)
      .select()
      .single();
    setBusy(false);
    if (error) return alert(error.message);
    setRows((list) => list.map((item) => (item.id === data.id ? data : item)));
  }

  return (
    <section className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-forest">{t("Alertes de croissance", "Child growth alerts")}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {t(
              "Consultez les alertes, commentez et sollicitez un accompagnement professionnel.",
              "Review alerts, comment and request professional support.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input className="admin-input w-64" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Rechercher...", "Search...")} />
          <select className="admin-input" value={severity} onChange={(event) => setSeverity(event.target.value)}>
            <option value="all">{t("Tous les niveaux", "All levels")}</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="admin-table min-w-[980px]">
          <thead>
            <tr>
              {[t("Date", "Date"), t("Alerte", "Alert"), t("Niveau", "Level"), t("Statut professionnel", "Professional status"), t("Votre commentaire", "Your comment"), t("Actions", "Actions")].map((heading) => <th key={heading}>{heading}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id}>
                <td>{new Date(row.created_at).toLocaleDateString(en ? "en-GB" : "fr-FR")}</td>
                <td><b>{row.title}</b><small className="block max-w-xl text-slate-500">{row.message}</small></td>
                <td><span className="rounded-full bg-orange/10 px-3 py-1 text-xs font-black uppercase text-orange">{row.severity}</span></td>
                <td>{row.acknowledged_at ? t("V\u00e9rifi\u00e9e", "Verified") : t("\u00c0 v\u00e9rifier", "Pending review")}</td>
                <td>{row.parent_comment || "\u2014"}</td>
                <td>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-mini" onClick={() => { setCommenting(row); setComment(row.parent_comment || ""); }}>{t("Commenter", "Comment")}</button>
                    <button disabled={!canRequestConsultation || busy || row.consultation_requested_at} className="btn-mini disabled:opacity-40" onClick={() => requestConsultation(row)}>
                      {row.consultation_requested_at ? t("Demand\u00e9e", "Requested") : t("Solliciter une consultation", "Request consultation")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={6} className="py-10 text-center text-slate-400">{t("Aucune alerte ne correspond aux filtres.", "No alert matches the filters.")}</td></tr>}
          </tbody>
        </table>
      </div>
      {!canRequestConsultation && (
        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
          {t(
            "La demande de consultation est disponible avec le suivi croissance Premium ou une consultation nutritionnelle/m\u00e9dicale active.",
            "Consultation requests are available with Premium child monitoring or an active nutrition/medical consultation.",
          )}
        </p>
      )}
      {commenting && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-[30px] bg-forest p-5 shadow-2xl">
            <div className="rounded-3xl bg-white p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-forest">{t("Commenter l\u2019alerte", "Comment on alert")}</h3>
                <button onClick={() => setCommenting(null)} className="text-2xl" aria-label={t("Fermer", "Close")}>{"\u00d7"}</button>
              </div>
              <textarea className="admin-input mt-5 min-h-36" value={comment} onChange={(event) => setComment(event.target.value)} placeholder={t("Vos observations...", "Your observations...")} />
              <div className="mt-5 flex justify-end"><button disabled={busy} onClick={saveComment} className="btn-primary">{t("Enregistrer", "Save")}</button></div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
