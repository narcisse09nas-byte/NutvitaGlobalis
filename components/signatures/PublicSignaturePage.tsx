"use client";

import { useEffect, useState } from "react";
import SignaturePad from "@/components/contracts/SignaturePad";

export default function PublicSignaturePage({ token }: { token: string }) {
  const [data, setData] = useState<any>(null);
  const [signature, setSignature] = useState<Blob | null>(null);
  const [initials, setInitials] = useState("");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    fetch(`/api/signatures/public/${token}`).then(async response => ({ response, result: await response.json() })).then(({ response, result }) => response.ok ? (setData(result), setName(result.recipient.full_name)) : setMessage(result.message));
    fetch("/api/signatures").then(response => response.ok ? response.json() : null).then(result => {
      if (result?.profile) {
        setName(result.profile.display_name || "");
        setInitials(result.profile.initials || "");
      }
    }).catch(() => undefined);
  }, [token]);
  async function submit() {
    if (!data || !consent) return;
    let signatureData: string | null = null;
    if (signature) signatureData = await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(signature); });
    else if (initials.trim()) {
      const canvas = document.createElement("canvas");
      canvas.width = 640; canvas.height = 220;
      const context = canvas.getContext("2d");
      if (context) {
        context.fillStyle = "white"; context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#123d32"; context.font = "italic 92px serif"; context.textAlign = "center"; context.textBaseline = "middle";
        context.fillText(initials.trim().toUpperCase(), canvas.width / 2, canvas.height / 2);
        signatureData = canvas.toDataURL("image/png");
      }
    }
    const response = await fetch(`/api/signatures/public/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sign", signer_name: name, consent, signature_data: signatureData }) });
    const result = await response.json();
    setMessage(response.ok ? "Signature enregistree. Une copie finale vous sera envoyee par email." : result.message);
    if (response.ok) setDone(true);
  }
  if (!data) return <main className="grid min-h-screen place-items-center bg-slate-50 p-6"><p className="rounded-lg bg-white p-8">{message || "Chargement du document..."}</p></main>;
  return <main className="min-h-screen bg-slate-50 p-4 md:p-8"><div className="mx-auto max-w-6xl"><header className="mb-6"><p className="text-xs font-black uppercase text-[#ef7f3b]">NutVitaGlobalis · Signature securisee</p><h1 className="text-3xl font-black text-[#123d32]">{data.envelope.title}</h1><p className="mt-2 text-slate-500">Reference {data.envelope.reference}</p></header><div className="grid gap-6 lg:grid-cols-[1fr_420px]"><iframe title="Document a signer" src={data.envelope.original_url} className="h-[75vh] w-full rounded-lg border bg-white" /><section className="h-fit rounded-lg border bg-white p-6"><h2 className="text-xl font-black">Signer le document</h2>{done ? <p className="mt-5 rounded-md bg-[#e7f5ee] p-4 font-bold text-[#123d32]">{message}</p> : !data.recipient.can_sign ? <p className="mt-5 rounded-md bg-amber-50 p-4 font-bold text-amber-900">{data.recipient.blocked_message}</p> : <><label className="mt-5 grid gap-2 text-sm font-bold">Nom complet<input className="admin-input" value={name} onChange={e => setName(e.target.value)} /></label>{data.recipient.role === "signer" && <><div className="mt-5"><SignaturePad onChange={setSignature} /></div><div className="my-4 text-center text-xs font-bold uppercase text-slate-400">ou signer avec vos initiales</div><label className="grid gap-2 text-sm font-bold">Initiales<input className="admin-input uppercase" maxLength={8} value={initials} onChange={e => setInitials(e.target.value)} /></label></>}<label className="mt-5 flex gap-3 text-sm"><input type="checkbox" className="mt-1 h-5 w-5" checked={consent} onChange={e => setConsent(e.target.checked)} />Je confirme avoir lu le document et consens a utiliser une signature electronique. Mon horodatage, mon adresse IP et l empreinte du document seront conserves comme preuve.</label><button onClick={submit} disabled={!consent || !name || (data.recipient.role === "signer" && !signature && !initials.trim())} className="mt-5 w-full rounded-md bg-[#24945f] px-5 py-3 font-bold text-white disabled:opacity-50">{data.recipient.role === "signer" ? "Signer et renvoyer" : "Approuver"}</button>{message && <p className="mt-4 text-sm text-red-700">{message}</p>}</>}</section></div></div></main>;
}
