"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import SignaturePad from "./SignaturePad";

type Contract = Record<string, any>;
const labels: Record<string, string> = { draft: "Brouillon", sent: "Envoye", opened: "Reception accusee", signed_by_nutvita: "Signe par NutVitaGlobalis", signed_by_party: "Signe par la partie", completed: "Completement signe", archived: "Archive" };

export default function ContractCenter({ initial, currentUserId, isAdmin = false }: { initial: Contract[]; currentUserId: string; isAdmin?: boolean }) {
  const [contracts, setContracts] = useState(initial);
  const [selected, setSelected] = useState<Contract | null>(null);
  const [signature, setSignature] = useState<Blob | null>(null);
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selected && !isAdmin && ["sent", "signed_by_nutvita"].includes(selected.status)) {
      fetch("/api/contracts/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: selected.id, action: "open" }) }).then(() => {
        setContracts(items => items.map(item => item.id === selected.id ? { ...item, status: selected.status === "sent" ? "opened" : selected.status, received_at: item.received_at || new Date().toISOString() } : item));
        setSelected(current => current ? { ...current, status: current.status === "sent" ? "opened" : current.status, received_at: current.received_at || new Date().toISOString() } : current);
      });
    }
  }, [selected?.id, isAdmin]);

  async function file(path: string) {
    const { data, error } = await createClient().storage.from("document-vault").createSignedUrl(path, 180);
    if (error) setMessage(error.message);
    else window.open(data.signedUrl, "_blank");
  }

  async function action(contract: Contract, value: string) {
    setLoading(true);
    const response = await fetch("/api/contracts/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: contract.id, action: value }) });
    const result = await response.json();
    setMessage(response.ok ? "Action effectuee." : result.message);
    if (response.ok) setContracts(contracts.map(item => item.id === contract.id ? { ...item, status: value === "send" ? "sent" : value === "archive" ? "archived" : item.status } : item));
    setLoading(false);
  }

  async function sign() {
    if (!selected || !signature || !name.trim() || !consent) return;
    setLoading(true);
    const role = isAdmin ? "nutvita" : selected.contract_type === "partner" ? "partner" : "client";
    const path = `${selected.party_user_id}/contracts/signatures/${selected.id}-${role}.png`;
    const supabase = createClient();
    const upload = await supabase.storage.from("document-vault").upload(path, signature, { contentType: "image/png", upsert: true });
    if (upload.error) {
      setMessage(upload.error.message);
      setLoading(false);
      return;
    }
    const response = await fetch("/api/contracts/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contract_id: selected.id, signature_path: path, signer_name: name }) });
    const result = await response.json();
    if (!response.ok) setMessage(result.message);
    else {
      setMessage("Signature enregistree et certificat actualise.");
      setContracts(contracts.map(item => item.id === selected.id ? { ...item, status: result.status, pdf_path: item.pdf_path } : item));
      setSelected({ ...selected, status: result.status });
      setSignature(null);
    }
    setLoading(false);
  }

  const alreadySigned = selected?.contract_signatures?.some((signature: Contract) => signature.signer_id === currentUserId) || (isAdmin && selected?.contract_signatures?.some((signature: Contract) => signature.signer_role === "nutvita"));

  return <div>
    <div className="grid gap-4">{contracts.map(contract => <article key={contract.id} className="rounded-2xl border bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-bold uppercase text-slate-400">{contract.contract_number}</p><h2 className="mt-1 text-xl font-black">{contract.title}</h2><p className="mt-1 text-sm text-slate-500">Destinataire : {contract.recipient_display_name || contract.party_name} {contract.recipient_email || contract.party_email ? `- ${contract.recipient_email || contract.party_email}` : ""}</p>{contract.received_at && <p className="mt-1 text-xs font-bold text-leaf">Reception accusee le {new Date(contract.received_at).toLocaleString("fr-FR")}</p>}</div>
        <span className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-leaf">{labels[contract.status] || contract.status}</span>
      </div>
      <div className="mt-5 flex flex-wrap gap-2"><button onClick={() => setSelected(contract)} className="btn-secondary px-4 py-2">Consulter / signer</button>{contract.pdf_path && <button onClick={() => file(contract.pdf_path)} className="btn-secondary px-4 py-2">PDF</button>}{contract.certificate_path && <button onClick={() => file(contract.certificate_path)} className="btn-secondary px-4 py-2">Certificat</button>}{isAdmin && contract.status === "draft" && <button disabled={loading} onClick={() => action(contract, "send")} className="btn-primary px-4 py-2">Envoyer au destinataire</button>}{isAdmin && contract.status === "completed" && <button onClick={() => action(contract, "archive")} className="btn-secondary px-4 py-2">Archiver</button>}</div>
    </article>)}{!contracts.length && <p className="rounded-2xl bg-white p-8 text-center text-slate-400">Aucun contrat.</p>}</div>
    {message && <p className="mt-5 rounded-xl bg-mint p-4 font-bold text-forest">{message}</p>}
    {selected && <div className="fixed inset-0 z-[120] overflow-y-auto bg-slate-950/70 p-4"><div className="mx-auto my-6 max-w-3xl rounded-3xl bg-slate-50 p-6 md:p-9">
      <div className="flex justify-between"><div><p className="text-xs font-bold text-slate-400">{selected.contract_number}</p><h2 className="text-2xl font-black">{selected.title}</h2></div><button onClick={() => setSelected(null)} className="text-3xl">x</button></div>
      <div className="mt-6 rounded-2xl bg-white p-6 leading-7"><p>Entre NutVitaGlobalis et <b>{selected.recipient_display_name || selected.party_name}</b>.</p>{selected.received_at && <p className="mt-3 rounded-xl bg-mint p-3 text-sm font-bold text-forest">Accuse de reception enregistre le {new Date(selected.received_at).toLocaleString("fr-FR")}.</p>}{Object.entries(selected.content || {}).map(([key, value]) => <div key={key} className="mt-5"><h3 className="font-black capitalize">{key.replaceAll("_", " ")}</h3><p>{String(value)}</p></div>)}</div>
      {!alreadySigned && selected.status !== "archived" && <div className="mt-6 rounded-2xl border bg-white p-6"><h3 className="text-xl font-black">Signature electronique</h3><label className="mt-4 grid gap-2 text-sm font-bold">Nom complet<input className="admin-input" value={name} onChange={event => setName(event.target.value)} /></label><div className="mt-4"><SignaturePad onChange={setSignature} /></div><label className="mt-4 flex gap-3 text-sm"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} className="h-5 w-5" />Je reconnais avoir lu ce document et accepte de le signer electroniquement. Mon horodatage, mon adresse IP et l'empreinte de signature seront conserves dans le certificat.</label><button disabled={!signature || !name || !consent || loading} onClick={sign} className="btn-primary mt-5 disabled:opacity-50">{loading ? "Signature..." : "Signer le document"}</button></div>}
    </div></div>}
  </div>;
}
