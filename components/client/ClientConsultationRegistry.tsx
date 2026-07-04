"use client";

import { useEffect, useState } from "react";
import { EyeIcon, PrinterIcon, XMarkIcon } from "@heroicons/react/24/outline";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/client";

type Row = Record<string, any>;

export default function ClientConsultationRegistry({ consultations, userEmail }: { consultations: Row[]; userEmail:string }) {
  const [selected, setSelected] = useState<Row | null>(null);
  const [message, setMessage] = useState("");

  async function open(path?: string) {
    if (!path) return;
    const { data, error } = await createClient().storage.from("document-vault").createSignedUrl(path, 180);
    if (error) setMessage(error.message); else window.open(data.signedUrl, "_blank");
  }

  return <section className="rounded-2xl border bg-white p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Registre de mes consultations</h2><p className="text-sm text-slate-500">Comptes rendus, objectifs, rendez-vous et ordonnances.</p></div><button type="button" onClick={() => window.print()} className="btn-secondary px-4 py-2"><PrinterIcon className="mr-2 h-4"/>Imprimer</button></div>
    {message && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p>}
    <div className="mt-5 grid gap-3">{consultations.map(row => <article key={row.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-50 p-4"><div><b>{row.reason || "Consultation nutritionnelle"}</b><p className="mt-1 text-sm text-slate-500">{new Date(row.finalized_at || row.scheduled_at).toLocaleString("fr-FR")} - {row.pack_type || "general"}</p></div><button type="button" onClick={() => setSelected(row)} className="btn-secondary px-4 py-2"><EyeIcon className="mr-2 h-4"/>Voir</button></article>)}{!consultations.length && <p className="text-slate-400">Aucune consultation finalisee.</p>}</div>
    {selected && <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/70 p-4"><article className="mx-auto my-8 max-w-4xl rounded-2xl bg-white p-7 print:my-0 print:max-w-none"><div className="flex justify-between gap-4"><div><p className="text-xs font-bold uppercase text-leaf">Mon suivi nutritionnel</p><h2 className="text-2xl font-black">{selected.reason || "Consultation nutritionnelle"}</h2><p className="text-sm text-slate-500">{new Date(selected.finalized_at || selected.scheduled_at).toLocaleString("fr-FR")}</p></div><button type="button" onClick={() => setSelected(null)} aria-label="Fermer"><XMarkIcon className="h-7"/></button></div>
      <div className="mt-7 grid gap-5 md:grid-cols-2"><Detail title="Plaintes prises en compte" text={`${array(selected.complaints).join(", ")} ${selected.complaint_notes || ""}`}/><Detail title="Objectifs" text={array(selected.goals).map((item:any)=>`${item.label}: ${item.target || "-"} ${item.unit || ""}`).join("\n")}/><Detail title="Evaluations nutritionnelles et mode de vie" text={selected.clinical_assessments?JSON.stringify(selected.clinical_assessments,null,2):"-"}/><Detail title="Plan d'accompagnement" text={Object.values(selected.care_plan || {}).filter(Boolean).join("\n")}/><Detail title="Prochain rendez-vous" text={selected.next_appointment_at ? new Date(selected.next_appointment_at).toLocaleString("fr-FR") : "Non programme"}/><Detail title="Examens demandes" text={array(selected.prescription_items).join("\n")}/></div>
      <PrintableAccessQr email={userEmail}/>
      <div className="mt-7 flex flex-wrap gap-3 print:hidden"><button type="button" onClick={() => window.print()} className="btn-secondary"><PrinterIcon className="mr-2 h-4"/>Imprimer la fiche</button><button type="button" onClick={() => open(selected.consultation_pdf_path)} className="btn-primary">Compte rendu PDF</button>{selected.prescription_pdf_path && <button type="button" onClick={() => open(selected.prescription_pdf_path)} className="btn-secondary">Ordonnance PDF</button>}</div>
    </article></div>}
  </section>;
}

function array(value: unknown) { return Array.isArray(value) ? value : []; }
function Detail({ title, text }: { title: string; text: string }) {
  return <section className="rounded-xl bg-slate-50 p-4"><h3 className="font-black">{title}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{text || "-"}</p></section>;
}
function PrintableAccessQr({ email }: { email:string }) {
  const [src,setSrc]=useState("");
  useEffect(()=>{QRCode.toDataURL(`${location.origin}/connexion?identifiant=${encodeURIComponent(email)}&redirect=${encodeURIComponent("/espace-client/consultations")}`,{width:220,margin:1}).then(setSrc)},[email]);
  return src?<div className="mt-7 flex items-center gap-3 border-t pt-5"><img src={src} alt="QR acces securise" className="h-20 w-20"/><p className="max-w-xs text-xs text-slate-500">Scannez pour vous connecter et retrouver cette consultation. Votre adresse email sera deja renseignee.</p></div>:null;
}
