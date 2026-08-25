"use client";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OpsCooperative, OpsPartnerProfile, OpsSitePaymentAccount } from "@/lib/ppm/types";

export default function PartnerProfileForm({ profile, email, cooperative, siteAccounts }: {
  profile: OpsPartnerProfile; email: string; cooperative?: OpsCooperative | null; siteAccounts?: OpsSitePaymentAccount[];
}) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cooperative) return;
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const result = await createClient().from("ppm_ops_cooperatives").update({
      default_payment_account_type: String(form.get("account_type") || "") || null,
      default_payment_account_name: String(form.get("account_name") || "").trim() || null,
      default_payment_account_number: String(form.get("account_number") || "").trim() || null,
    }).eq("id", cooperative.id);
    setSaving(false);
    setMessage(result.error ? result.error.message : "Compte de paiement mis a jour.");
  }

  return <div className="grid gap-6">
    <h1 className="text-3xl font-black text-forest">Mon profil</h1>
    <div className="rounded-2xl border bg-white p-6">
      <p><b>{profile.full_name}</b></p>
      <p className="mt-1 text-sm text-slate-500">{email}{profile.phone ? ` · ${profile.phone}` : ""}</p>
      <p className="mt-1 text-sm text-slate-500">{profile.partner_type === "coges" ? "Membre du COGES" : "Cooperative / GIC"}</p>
    </div>

    {cooperative && <form onSubmit={submit} className="grid gap-4 rounded-2xl border bg-white p-6 sm:grid-cols-2">
      <h2 className="text-sm font-black uppercase text-slate-400 sm:col-span-2">Compte de paiement de la cooperative</h2>
      <label className="grid gap-2 text-sm font-bold">Type de compte<select name="account_type" defaultValue={cooperative.default_payment_account_type || ""} className="admin-input"><option value="">—</option><option value="mobile_money">Mobile money</option><option value="bank">Banque</option><option value="other">Autre</option></select></label>
      <label className="grid gap-2 text-sm font-bold">Titulaire du compte<input name="account_name" defaultValue={cooperative.default_payment_account_name || ""} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold sm:col-span-2">Numero de compte<input name="account_number" defaultValue={cooperative.default_payment_account_number || ""} className="admin-input" /></label>
      {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
      <div className="sm:col-span-2"><button disabled={saving} className="btn-primary">{saving ? "Enregistrement..." : "Enregistrer"}</button></div>
    </form>}

    {!cooperative && !!siteAccounts?.length && <div className="rounded-2xl border bg-white p-6">
      <h2 className="text-sm font-black uppercase text-slate-400">Compte(s) de paiement de l&apos;ecole</h2>
      <div className="mt-3 grid gap-2">{siteAccounts.map(item => <div key={item.id} className="rounded-xl bg-slate-50 px-4 py-2 text-sm">{item.account_type} — {item.account_name} ({item.account_number})</div>)}</div>
    </div>}
  </div>;
}
