"use client";

import { FormEvent, useState } from "react";
import ContractCenter from "@/components/contracts/ContractCenter";
import { createClient } from "@/lib/supabase/client";

type Party = { id: string; full_name: string | null; email?: string | null; candidate_id?: string };
type Contract = Record<string, any>;

export default function AdminContracts({ initial, clients, partners, adminId }: { initial: Contract[]; clients: Party[]; partners: Party[]; adminId: string }) {
  const [contracts, setContracts] = useState(initial);
  const [type, setType] = useState("client_service");
  const [partyId, setPartyId] = useState("");
  const [title, setTitle] = useState("Contrat de prestation nutritionnelle");
  const [message, setMessage] = useState("");

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const isPartner = type === "partner";
    const party = (isPartner ? partners : clients).find(item => item.id === partyId);
    if (!party) return;
    const fd = new FormData(event.currentTarget);
    const userId = isPartner ? party.candidate_id! : party.id;
    const receiverName = String(fd.get("receiver_name") || party.full_name || party.email || "");
    const receiverEmail = String(fd.get("receiver_email") || party.email || "");
    const number = `NVG-${isPartner ? "PART" : "CLI"}-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const content = isPartner ? {
      destinataire: `${receiverName} <${receiverEmail}>`,
      missions: "Teleconseil, suivi personnalise, nutrition clinique et programmes en ligne",
      obligations: "Respect des standards professionnels et du secret professionnel",
      confidentiality: "Protection des donnees de sante",
      financial_terms: "Selon la grille validee et les paiements dus au partenaire",
      duration: "12 mois renouvelables",
      termination: "Preavis et manquement contractuel",
    } : {
      destinataire: `${receiverName} <${receiverEmail}>`,
      missions: "Accompagnement nutritionnel et suivi personnalise",
      obligations: "Exactitude des informations de sante et respect des rendez-vous",
      confidentiality: "Protection du dossier nutritionnel et secret professionnel",
      financial_terms: "Selon le pack ou devis accepte",
      duration: "Duree du programme souscrit",
      termination: "Selon les conditions generales de prestation",
    };
    const payload = { contract_number: number, contract_type: type, title, party_user_id: userId, party_name: receiverName, party_email: receiverEmail, recipient_display_name: receiverName, recipient_email: receiverEmail, client_id: isPartner ? null : party.id, dietitian_profile_id: isPartner ? party.id : null, status: "draft", content, created_by: adminId };
    const { data, error } = await createClient().from("contracts").insert(payload).select("*, contract_signatures(*)").single();
    if (error) setMessage(error.message);
    else {
      setContracts([data, ...contracts]);
      setMessage("Contrat cree en brouillon. Utilisez Envoyer pour le partager au destinataire.");
      event.currentTarget.reset();
      setPartyId("");
    }
  }

  const options = type === "partner" ? partners : clients;
  const selected = options.find(item => item.id === partyId);

  return <div>
    <form onSubmit={create} className="mb-8 grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-3">
      <div className="md:col-span-3"><h2 className="text-xl font-black">Nouveau contrat individuel</h2><p className="mt-1 text-sm text-slate-500">Le contrat est prive : il sera envoye uniquement au destinataire choisi, qui pourra accuser reception et signer dans son espace.</p></div>
      <label className="grid gap-2 text-sm font-bold">Type<select className="admin-input" value={type} onChange={event => { setType(event.target.value); setPartyId(""); }}><option value="client_service">Contrat client</option><option value="informed_consent">Consentement eclaire</option><option value="privacy">Confidentialite</option><option value="service_agreement">Contrat de prestation</option><option value="partner">Contrat partenaire</option><option value="amendment">Avenant</option></select></label>
      <label className="grid gap-2 text-sm font-bold">Compte destinataire<select required className="admin-input" value={partyId} onChange={event => setPartyId(event.target.value)}><option value="">Selectionner</option>{options.map(item => <option key={item.id} value={item.id}>{item.full_name || item.email}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-bold">Titre<input required className="admin-input" value={title} onChange={event => setTitle(event.target.value)} /></label>
      <label className="grid gap-2 text-sm font-bold">Nom du recepteur<input name="receiver_name" required className="admin-input" defaultValue={selected?.full_name || ""} key={`${partyId}-name`} /></label>
      <label className="grid gap-2 text-sm font-bold">Email du recepteur<input name="receiver_email" type="email" required className="admin-input" defaultValue={selected?.email || ""} key={`${partyId}-email`} /></label>
      <button className="btn-primary justify-self-start self-end">Creer le contrat</button>
    </form>
    {message && <p className="mb-5 rounded-xl bg-mint p-4 font-bold text-forest">{message}</p>}
    <ContractCenter initial={contracts} currentUserId={adminId} isAdmin />
  </div>;
}
