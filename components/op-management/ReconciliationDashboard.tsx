"use client";
import { useState, type FormEvent } from "react";
import { ChatBubbleLeftIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type {
  OpsReconciliationCooperativeRow, OpsReconciliationDatesRow, OpsReconciliationNote,
  OpsReconciliationNoteCategory, OpsReconciliationProductRow, OpsReconciliationValueRow,
} from "@/lib/ppm/types";

function fmtDate(value?: string | null, en?: boolean) { return value ? new Date(value).toLocaleDateString(en ? "en-US" : "fr-FR") : "—"; }

function NotesForReference({ notes, category, referenceId }: { notes: OpsReconciliationNote[]; category: OpsReconciliationNoteCategory; referenceId: string }) {
  const matched = notes.filter(item => item.category === category && item.reference_id === referenceId);
  if (!matched.length) return null;
  return <div className="mt-1 grid gap-1">{matched.map(item => <p key={item.id} className="rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-900">{item.note}</p>)}</div>;
}

function AddNoteForm({ operationId, category, referenceId, siteId, onAdded }: {
  operationId: string; category: OpsReconciliationNoteCategory; referenceId: string; siteId?: string | null;
  onAdded: (note: OpsReconciliationNote) => void;
}) {
  const { en } = usePpmLocale();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const note = String(form.get("note") || "").trim();
    if (!note) { setSaving(false); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const result = await supabase.from("ppm_ops_reconciliation_notes").insert({
      operation_id: operationId, category, reference_id: referenceId, site_id: siteId || null, note, created_by: user?.id,
    }).select("*").single();
    setSaving(false);
    if (!result.error) { onAdded(result.data as OpsReconciliationNote); setOpen(false); event.currentTarget.reset(); }
  }

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="mt-1 flex items-center gap-1 text-xs font-bold text-leaf"><ChatBubbleLeftIcon className="h-3.5" />{en ? "Add a note" : "Ajouter une note"}</button>;
  return <form onSubmit={submit} className="mt-1 flex flex-wrap items-center gap-2">
    <input name="note" placeholder={en ? "Explain the variance..." : "Expliquer l'ecart..."} required className="admin-input flex-1 py-1 text-xs" />
    <button disabled={saving} className="btn-secondary px-3 py-1 text-xs">{saving ? "..." : (en ? "Save" : "Enregistrer")}</button>
  </form>;
}

export default function ReconciliationDashboard({ operationId, isSfHgsf, products, value, cooperative, dates, initialNotes }: {
  operationId: string; isSfHgsf: boolean;
  products: OpsReconciliationProductRow[]; value: OpsReconciliationValueRow[];
  cooperative: OpsReconciliationCooperativeRow[]; dates: OpsReconciliationDatesRow[];
  initialNotes: OpsReconciliationNote[];
}) {
  const { en } = usePpmLocale();
  const [notes, setNotes] = useState(initialNotes);
  const addNote = (note: OpsReconciliationNote) => setNotes(current => [note, ...current]);

  return <div className="grid gap-8">
    <section className="grid gap-3">
      <h2 className="text-xl font-black text-forest">{en ? "Products received vs. distributed" : "Produits recus vs distribues"}</h2>
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">{en ? "Site" : "Site"}</th><th className="p-3">{en ? "Product" : "Produit"}</th><th className="p-3">{en ? "Available" : "Disponible"}</th><th className="p-3">{en ? "Accounted for" : "Justifie"}</th><th className="p-3">{en ? "Variance" : "Ecart"}</th></tr></thead>
          <tbody>
            {products.map(row => <tr key={`${row.report_id}-${row.product_id}`} className="border-t align-top">
              <td className="p-3">{row.site_name}</td>
              <td className="p-3">{row.product_name}</td>
              <td className="p-3">{row.total_available}</td>
              <td className="p-3">{row.total_accounted}</td>
              <td className="p-3">
                <span className={`font-bold ${row.variance !== 0 ? "text-red-600" : "text-emerald-700"}`}>{row.variance}</span>
                <NotesForReference notes={notes} category="products" referenceId={`${row.report_id}:${row.product_id}`} />
                <AddNoteForm operationId={operationId} category="products" referenceId={`${row.report_id}:${row.product_id}`} siteId={row.site_id} onAdded={addNote} />
              </td>
            </tr>)}
            {!products.length && <tr><td colSpan={5} className="p-8 text-center text-slate-400">{en ? "No activity report yet." : "Aucun rapport de distribution pour le moment."}</td></tr>}
          </tbody>
        </table>
      </div>
    </section>

    <section className="grid gap-3">
      <h2 className="text-xl font-black text-forest">{en ? "Distributed value vs. invoiced / paid to school" : "Valeur distribuee vs facturee / payee a l'ecole"}</h2>
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">{en ? "Site" : "Site"}</th><th className="p-3">{en ? "Distributed" : "Distribue"}</th><th className="p-3">{en ? "Invoiced" : "Facture"}</th><th className="p-3">{en ? "Variance" : "Ecart"}</th><th className="p-3">{en ? "Paid to school" : "Payee a l'ecole"}</th></tr></thead>
          <tbody>
            {value.map(row => <tr key={row.report_id} className="border-t align-top">
              <td className="p-3">{row.site_name}</td>
              <td className="p-3">{row.amount_distributed_figures?.toLocaleString(en ? "en-US" : "fr-FR") ?? "—"} {row.amount_distributed_currency || ""}</td>
              <td className="p-3">{row.invoice_amount?.toLocaleString(en ? "en-US" : "fr-FR") ?? "—"} {row.invoice_currency || ""}</td>
              <td className="p-3">
                <span className={`font-bold ${row.variance_distributed_vs_invoiced !== 0 ? "text-red-600" : "text-emerald-700"}`}>{row.variance_distributed_vs_invoiced}</span>
                <NotesForReference notes={notes} category="value" referenceId={row.report_id} />
                <AddNoteForm operationId={operationId} category="value" referenceId={row.report_id} siteId={row.site_id} onAdded={addNote} />
              </td>
              <td className="p-3">{row.is_paid_to_school ? <span className="rounded-full bg-mint px-2 py-0.5 text-xs font-bold text-forest">{en ? "Yes" : "Oui"}</span> : <span className="text-xs text-slate-400">{en ? "No" : "Non"}</span>}</td>
            </tr>)}
            {!value.length && <tr><td colSpan={5} className="p-8 text-center text-slate-400">{en ? "No activity report yet." : "Aucun rapport de distribution pour le moment."}</td></tr>}
          </tbody>
        </table>
      </div>
    </section>

    {isSfHgsf && <section className="grid gap-3">
      <h2 className="text-xl font-black text-forest">{en ? "Paid to school vs. paid to cooperative" : "Payee a l'ecole vs payee a la cooperative"}</h2>
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">{en ? "Invoice" : "Facture"}</th><th className="p-3">{en ? "Cooperative" : "Cooperative"}</th><th className="p-3">{en ? "Paid to school" : "Payee a l'ecole"}</th><th className="p-3">{en ? "Paid to cooperative" : "Payee a la cooperative"}</th><th className="p-3">{en ? "Flag" : "Alerte"}</th></tr></thead>
          <tbody>
            {cooperative.map(row => <tr key={row.invoice_id} className="border-t align-top">
              <td className="p-3 font-mono text-xs">{row.invoice_id}</td>
              <td className="p-3">{row.cooperative_name || "—"}</td>
              <td className="p-3">{fmtDate(row.paid_to_school_at, en)}</td>
              <td className="p-3">{fmtDate(row.paid_to_cooperative_at, en)}</td>
              <td className="p-3">
                {row.anomaly_paid_cooperative_before_school && <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">{en ? "Paid coop. before school" : "Coop. payee avant l'ecole"}</span>}
                {row.pending_cooperative_payment && !row.anomaly_paid_cooperative_before_school && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800">{en ? "Cooperative payment pending" : "Paiement cooperative en attente"}</span>}
                <NotesForReference notes={notes} category="cooperative_payment" referenceId={row.invoice_id} />
                <AddNoteForm operationId={operationId} category="cooperative_payment" referenceId={row.invoice_id} siteId={row.site_id} onAdded={addNote} />
              </td>
            </tr>)}
            {!cooperative.length && <tr><td colSpan={5} className="p-8 text-center text-slate-400">{en ? "No invoice yet." : "Aucune facture pour le moment."}</td></tr>}
          </tbody>
        </table>
      </div>
    </section>}

    <section className="grid gap-3">
      <h2 className="text-xl font-black text-forest">{en ? "Planned vs. actual dates / ration days" : "Dates / jours de ration planifies vs reels"}</h2>
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">{en ? "Site" : "Site"}</th><th className="p-3">{en ? "Planned dates" : "Dates planifiees"}</th><th className="p-3">{en ? "Actual dates" : "Dates reelles"}</th><th className="p-3">{en ? "Ration days variance" : "Ecart jours de ration"}</th></tr></thead>
          <tbody>
            {dates.map(row => <tr key={row.report_id} className="border-t align-top">
              <td className="p-3">{row.site_name}</td>
              <td className="p-3">{fmtDate(row.planned_distribution_start, en)} → {fmtDate(row.planned_distribution_end, en)}</td>
              <td className="p-3">
                <span className={row.start_date_shifted || row.end_date_shifted ? "font-bold text-amber-700" : ""}>{fmtDate(row.effective_distribution_start, en)} → {fmtDate(row.effective_distribution_end, en)}</span>
              </td>
              <td className="p-3">
                <span className={`font-bold ${row.ration_days_variance ? "text-red-600" : "text-emerald-700"}`}>{row.ration_days_variance ?? "—"}</span>
                <NotesForReference notes={notes} category="dates" referenceId={row.report_id} />
                <AddNoteForm operationId={operationId} category="dates" referenceId={row.report_id} siteId={row.site_id} onAdded={addNote} />
              </td>
            </tr>)}
            {!dates.length && <tr><td colSpan={4} className="p-8 text-center text-slate-400">{en ? "No activity report yet." : "Aucun rapport de distribution pour le moment."}</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  </div>;
}
