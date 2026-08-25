"use client";
import { useState, type FormEvent } from "react";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { OpsDonorSynthesisExport } from "@/lib/ppm/types";

export default function DonorSynthesisGenerator({ operationId, initial }: { operationId: string; initial: OpsDonorSynthesisExport[] }) {
  const { en } = usePpmLocale();
  const [rows, setRows] = useState(initial);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");

  async function viewExport(item: OpsDonorSynthesisExport) {
    if (!item.file_path) return;
    const { data, error } = await createClient().storage.from("document-vault").createSignedUrl(item.file_path, 180);
    if (!error) window.open(data.signedUrl, "_blank");
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGenerating(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const periodStart = String(form.get("period_start") || "");
    const periodEnd = String(form.get("period_end") || "");
    const preparedByName = String(form.get("prepared_by_name") || "").trim();
    const approvedByName = String(form.get("approved_by_name") || "").trim();
    if (!periodStart || !periodEnd) { setGenerating(false); setMessage(en ? "Select a period." : "Selectionnez une periode."); return; }

    const response = await fetch("/api/ppm/operations/donor-synthesis/export-pdf", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operation_id: operationId, period_start: periodStart, period_end: periodEnd, prepared_by_name: preparedByName, approved_by_name: approvedByName }),
    });
    setGenerating(false);
    if (!response.ok) { setMessage(en ? "Generation failed." : "Echec de la generation."); return; }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `synthese-bailleur-${operationId}.pdf`; link.click();
    URL.revokeObjectURL(url);

    const supabase = createClient();
    const result = await supabase.from("ppm_ops_donor_synthesis_exports").select("*").eq("operation_id", operationId).order("generated_at", { ascending: false }).limit(1).single();
    if (!result.error) setRows(current => [result.data as OpsDonorSynthesisExport, ...current]);
  }

  return <div className="grid gap-6">
    <div className="grid gap-3">
      <h2 className="text-xl font-black text-forest">{en ? "Donor synthesis file" : "Fichier de synthese bailleur"}</h2>
      <form onSubmit={generate} className="grid gap-4 rounded-2xl border bg-white p-6 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold">{en ? "Period start" : "Debut de periode"}<input type="date" name="period_start" required className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Period end" : "Fin de periode"}<input type="date" name="period_end" required className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Prepared by" : "Prepare par"}<input name="prepared_by_name" className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Approved by" : "Approuve par"}<input name="approved_by_name" className="admin-input" /></label>
        {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
        <div className="sm:col-span-2"><button disabled={generating} className="btn-primary px-4 py-2 text-sm"><ArrowDownTrayIcon className="mr-2 inline h-4" />{generating ? (en ? "Generating..." : "Generation...") : (en ? "Generate & download" : "Generer & telecharger")}</button></div>
      </form>
    </div>

    <div className="grid gap-3">
      <h3 className="text-sm font-black uppercase text-slate-400">{en ? "Previously generated files" : "Fichiers precedemment generes"}</h3>
      <div className="grid gap-2">
        {rows.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white px-4 py-3 text-sm">
          <span>{new Date(item.period_start).toLocaleDateString(en ? "en-US" : "fr-FR")} → {new Date(item.period_end).toLocaleDateString(en ? "en-US" : "fr-FR")}{item.prepared_by_name ? ` · ${item.prepared_by_name}` : ""}</span>
          <button type="button" onClick={() => viewExport(item)} className="text-xs font-bold text-leaf">{en ? "View" : "Voir"}</button>
        </div>)}
        {!rows.length && <p className="rounded-2xl border bg-white p-8 text-center text-slate-400">{en ? "No file generated yet." : "Aucun fichier genere pour le moment."}</p>}
      </div>
    </div>
  </div>;
}
