"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OpsInvoice, OpsInvoiceStatus, OpsPartnerType } from "@/lib/ppm/types";

const statusLabels: Record<OpsInvoiceStatus, string> = {
  draft: "Brouillon", submitted: "Soumise", distribution_manager_endorsed: "Validee (resp. distribution)",
  school_endorsed: "Endossee (ecole)", in_synthesis: "Dans le fichier de synthese", paid_to_school: "Payee a l'ecole",
  paid_to_cooperative: "Payee a la cooperative", rejected: "Rejetee",
};

export default function PartnerInvoiceDetail({ invoice: initialInvoice, siteName, cooperativeName, partnerType }: {
  invoice: OpsInvoice; siteName: string; cooperativeName?: string; partnerType: OpsPartnerType;
}) {
  const [invoice, setInvoice] = useState(initialInvoice);
  const [saving, setSaving] = useState(false);

  async function advance(nextStatus: OpsInvoiceStatus) {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const result = await supabase.from("ppm_ops_invoices").update({ status: nextStatus }).eq("id", invoice.id).select("*").single();
    setSaving(false);
    if (result.error) return;
    setInvoice(result.data as OpsInvoice);
    await supabase.from("ppm_history").insert({ entity_type: "invoice", entity_id: invoice.id, actor_id: user?.id, action: `Facture ${statusLabels[nextStatus].toLowerCase()}`, from_status: invoice.status, to_status: nextStatus });
  }

  const canCooperativeSubmit = partnerType === "cooperative" && invoice.status === "draft";
  const canSchoolEndorse = partnerType === "coges" && invoice.status === "distribution_manager_endorsed";

  return <div className="grid gap-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-black text-forest">{invoice.id}</h1><p className="mt-1 text-sm text-slate-500">{siteName}{cooperativeName ? ` — ${cooperativeName}` : ""}</p></div>
      <span className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-forest">{statusLabels[invoice.status]}</span>
    </div>

    <p className="rounded-xl bg-mint/30 p-4 text-lg font-black text-forest">{invoice.amount_figures.toLocaleString("fr-FR")} {invoice.currency}<br /><span className="text-sm font-normal italic text-slate-600">{invoice.amount_words}</span></p>
    {invoice.payment_account_number && <p className="text-sm text-slate-500">Compte de paiement : {invoice.payment_account_name} — {invoice.payment_account_number}</p>}

    <div className="flex flex-wrap gap-3">
      {canCooperativeSubmit && <button onClick={() => advance("submitted")} disabled={saving} className="btn-primary px-4 py-2 text-sm">Soumettre la facture</button>}
      {canSchoolEndorse && <button onClick={() => advance("school_endorsed")} disabled={saving} className="btn-primary px-4 py-2 text-sm">Endosser (au nom de l&apos;ecole)</button>}
    </div>
  </div>;
}
