"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import SignaturePad from "@/components/contracts/SignaturePad";

type Row = Record<string, any>;
type Recipient = { full_name: string; email: string; role: string; signing_order: number };

export default function SignatureCenter() {
  const [sent, setSent] = useState<Row[]>([]);
  const [received, setReceived] = useState<Row[]>([]);
  const [profile, setProfile] = useState<Row | null>(null);
  const [tab, setTab] = useState<"received" | "sent" | "new" | "profile">("received");
  const [recipients, setRecipients] = useState<Recipient[]>([{ full_name: "", email: "", role: "signer", signing_order: 1 }]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedSignature, setSavedSignature] = useState<Blob | null>(null);

  async function load() {
    const response = await fetch("/api/signatures");
    const result = await response.json();
    if (response.ok) {
      setSent(result.sent);
      setReceived(result.received);
      setProfile(result.profile);
    }
  }
  useEffect(() => { load(); }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("document") as File;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !file?.size) {
      setMessage("Selectionnez un document.");
      setBusy(false);
      return;
    }
    const path = `${user.id}/originals/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const upload = await supabase.storage.from("electronic-signatures").upload(path, file, { contentType: file.type });
    if (upload.error) {
      setMessage(upload.error.message);
      setBusy(false);
      return;
    }
    const response = await fetch("/api/signatures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.get("title"),
        message: data.get("message"),
        original_file_path: path,
        original_file_name: file.name,
        original_mime_type: file.type,
        signing_order_enabled: data.get("signing_order_enabled") === "on",
        expires_at: data.get("expires_at") || null,
        recipients,
      }),
    });
    const result = await response.json();
    setMessage(response.ok ? "Document envoye pour signature." : result.message);
    if (response.ok) {
      form.reset();
      setRecipients([{ full_name: "", email: "", role: "signer", signing_order: 1 }]);
      setTab("sent");
      await load();
    }
    setBusy(false);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    let signaturePath = profile?.signature_path || null;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (savedSignature && user) {
      signaturePath = `${user.id}/profile/signature.png`;
      const upload = await supabase.storage.from("electronic-signatures").upload(signaturePath, savedSignature, { contentType: "image/png", upsert: true });
      if (upload.error) {
        setMessage(upload.error.message);
        setBusy(false);
        return;
      }
    }
    const response = await fetch("/api/signatures", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "profile", display_name: form.get("display_name"), initials: form.get("initials"), signature_path: signaturePath }),
    });
    const result = await response.json();
    setMessage(response.ok ? "Parametres de signature enregistres." : result.message);
    if (response.ok) setProfile(result.profile);
    setBusy(false);
  }

  async function openFile(path: string) {
    const { data, error } = await createClient().storage.from("electronic-signatures").createSignedUrl(path, 300);
    if (error) setMessage("Le fichier final est accessible au proprietaire et par la copie recue par email.");
    else window.open(data.signedUrl, "_blank");
  }

  const tabs = [["received", "A signer"], ["sent", "Envoyes"], ["new", "Nouvel envoi"], ["profile", "Ma signature"]] as const;
  return <div className="mx-auto max-w-6xl p-5 lg:p-8">
    <div className="mb-7"><p className="text-xs font-black uppercase text-[#ef7f3b]">Documents securises</p><h1 className="text-3xl font-black text-[#123d32]">Signatures electroniques</h1><p className="mt-2 text-slate-500">Envoyez, signez et archivez vos documents avec une piste d audit complete.</p></div>
    <div className="mb-6 flex flex-wrap gap-2">{tabs.map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={`rounded-md px-4 py-2 text-sm font-bold ${tab === key ? "bg-[#123d32] text-white" : "border bg-white"}`}>{label}</button>)}</div>
    {message && <p className="mb-5 rounded-md bg-[#e7f5ee] p-4 font-bold text-[#123d32]">{message}</p>}

    {tab === "new" && <form onSubmit={create} className="grid gap-5 rounded-lg border bg-white p-6">
      <div className="grid gap-4 md:grid-cols-2"><label className="grid gap-2 text-sm font-bold">Titre<input name="title" required className="admin-input" /></label><label className="grid gap-2 text-sm font-bold">Document PDF<input name="document" type="file" required accept="application/pdf,.pdf" className="admin-input" /></label></div>
      <label className="grid gap-2 text-sm font-bold">Message<textarea name="message" className="admin-input min-h-24" /></label>
      <div><div className="mb-3 flex justify-between"><h2 className="font-black">Destinataires</h2><button type="button" onClick={() => setRecipients([...recipients, { full_name: "", email: "", role: "signer", signing_order: recipients.length + 1 }])} className="rounded-md border px-3 py-2 text-sm font-bold">Ajouter</button></div>
        <div className="grid gap-3">{recipients.map((recipient, index) => <div key={index} className="grid gap-3 rounded-md bg-slate-50 p-4 md:grid-cols-[1fr_1fr_160px_90px]"><input required className="admin-input" placeholder="Nom complet" value={recipient.full_name} onChange={e => setRecipients(recipients.map((item, i) => i === index ? { ...item, full_name: e.target.value } : item))} /><input required type="email" className="admin-input" placeholder="email@exemple.com" value={recipient.email} onChange={e => setRecipients(recipients.map((item, i) => i === index ? { ...item, email: e.target.value } : item))} /><select className="admin-input" value={recipient.role} onChange={e => setRecipients(recipients.map((item, i) => i === index ? { ...item, role: e.target.value } : item))}><option value="signer">Signataire</option><option value="approver">Approbateur</option><option value="copy">Copie</option></select><input type="number" min="1" className="admin-input" value={recipient.signing_order} onChange={e => setRecipients(recipients.map((item, i) => i === index ? { ...item, signing_order: Number(e.target.value) } : item))} /></div>)}</div>
      </div>
      <div className="flex flex-wrap gap-5"><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="signing_order_enabled" />Respecter l ordre de signature</label><label className="grid gap-1 text-sm font-bold">Expiration<input type="datetime-local" name="expires_at" className="admin-input" /></label></div>
      <button disabled={busy} className="w-fit rounded-md bg-[#24945f] px-5 py-3 font-bold text-white">{busy ? "Envoi..." : "Envoyer pour signature"}</button>
    </form>}

    {tab === "profile" && <form onSubmit={saveProfile} className="grid max-w-2xl gap-5 rounded-lg border bg-white p-6"><h2 className="text-xl font-black">Parametres de signature</h2><label className="grid gap-2 text-sm font-bold">Nom affiche<input name="display_name" defaultValue={profile?.display_name || ""} required className="admin-input" /></label><label className="grid gap-2 text-sm font-bold">Initiales<input name="initials" defaultValue={profile?.initials || ""} required maxLength={8} className="admin-input uppercase" /></label><div><p className="mb-2 text-sm font-bold">Signature enregistree</p><SignaturePad onChange={setSavedSignature} /></div><button disabled={busy} className="w-fit rounded-md bg-[#24945f] px-5 py-3 font-bold text-white">Enregistrer</button></form>}

    {tab === "sent" && <EnvelopeList items={sent} sent openFile={openFile} />}
    {tab === "received" && <EnvelopeList items={received.map(item => ({ ...item.signature_envelopes, recipient_status: item.status, signing_url: item.signing_url, final_url: item.final_url }))} openFile={openFile} />}
  </div>;
}

function EnvelopeList({ items, sent = false, openFile }: { items: Row[]; sent?: boolean; openFile: (path: string) => void }) {
  return <div className="grid gap-3">{items.map(item => <article key={item.id} className="rounded-lg border bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-mono text-xs text-slate-400">{item.reference}</p><h2 className="mt-1 text-lg font-black">{item.title}</h2><p className="mt-1 text-sm text-slate-500">{sent ? `${item.signature_recipients?.length || 0} destinataire(s)` : "Recu pour signature"}</p></div><span className="h-fit rounded-full bg-[#e7f5ee] px-3 py-1 text-xs font-bold text-[#123d32]">{item.recipient_status || item.status}</span></div><div className="mt-4 flex gap-2">{item.signing_url && !["signed","approved"].includes(item.recipient_status) && <a href={item.signing_url} className="rounded-md bg-[#24945f] px-3 py-2 text-sm font-bold text-white">Lire et signer</a>}{item.final_url ? <a href={item.final_url} target="_blank" rel="noreferrer" className="rounded-md border px-3 py-2 text-sm font-bold">Copie signee</a> : item.final_file_path && <button onClick={() => openFile(item.final_file_path)} className="rounded-md border px-3 py-2 text-sm font-bold">Copie signee</button>}</div></article>)}{!items.length && <p className="rounded-lg border bg-white p-10 text-center text-slate-400">Aucun document dans cette section.</p>}</div>;
}
