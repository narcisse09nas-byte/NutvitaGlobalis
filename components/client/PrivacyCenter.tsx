"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Consent = Record<string, any>;
type RequestRow = Record<string, any>;

export default function PrivacyCenter({ userId, consents: initialConsents, requests: initialRequests }: { userId: string; consents: Consent[]; requests: RequestRow[] }) {
  const [consents, setConsents] = useState(initialConsents);
  const [requests, setRequests] = useState(initialRequests);
  const [message, setMessage] = useState("");

  async function toggleConsent(type: string, accepted: boolean) {
    const payload = { user_id: userId, consent_type: type, accepted, signed_at: new Date().toISOString(), signature_text: accepted ? "Consentement modifie depuis l espace client" : "Consentement retire depuis l espace client" };
    const { data, error } = await createClient().from("user_consents").upsert(payload, { onConflict: "user_id,consent_type" }).select().single();
    if (error) setMessage(error.message); else { setConsents([data, ...consents.filter(x => x.consent_type !== type)]); setMessage("Consentements mis a jour."); }
  }

  async function requestPrivacy(type: string) {
    const { data, error } = await createClient().from("privacy_requests").insert({ user_id: userId, request_type: type, details: `Demande ${type} depuis l espace client` }).select().single();
    if (error) setMessage(error.message); else { setRequests([data, ...requests]); setMessage("Demande enregistree."); }
  }

  async function downloadData() {
    const response = await fetch("/api/client/privacy/export");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "nutvita-donnees-personnelles.json"; link.click(); URL.revokeObjectURL(url);
  }

  const value = (type: string) => consents.find(x => x.consent_type === type)?.accepted !== false;
  return <div className="grid gap-6"><section className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-black">Mes consentements</h2><div className="mt-4 grid gap-3">{[["health_data", "Traitement des donnees de sante"], ["teleconsultation", "Teleconsultation nutritionnelle"], ["marketing", "Informations et newsletters"], ["data_sharing", "Partage avec le professionnel affecte"]].map(([type, label]) => <label key={type} className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-4 font-bold"><span>{label}</span><input type="checkbox" checked={value(type)} onChange={event => toggleConsent(type, event.target.checked)} className="h-5 w-5" /></label>)}</div></section><section className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-black">Mes donnees personnelles</h2><div className="mt-4 flex flex-wrap gap-3"><button onClick={downloadData} className="btn-primary">Telecharger mes donnees</button><button onClick={() => requestPrivacy("delete")} className="btn-secondary">Demander la suppression</button><button onClick={() => requestPrivacy("rectification")} className="btn-secondary">Demander une rectification</button></div>{message && <p className="mt-4 rounded-xl bg-mint p-4 font-bold text-forest">{message}</p>}</section><section className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-black">Historique des demandes</h2><div className="mt-4 grid gap-3">{requests.map(row => <div key={row.id} className="rounded-xl bg-slate-50 p-4"><b>{row.request_type}</b><p className="text-sm text-slate-500">{row.status} - {new Date(row.requested_at || row.created_at).toLocaleDateString("fr-FR")}</p></div>)}{!requests.length && <p className="text-slate-400">Aucune demande.</p>}</div></section></div>;
}
