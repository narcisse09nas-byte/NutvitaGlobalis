"use client";

import { FormEvent, useState } from "react";

export default function WhatsAppContact({ number, label = "Contact" }: { number: string; label?: string }) {
  const [open, setOpen] = useState(false);
  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const message = String(data.get("message") ?? "").trim();
    if (!message) return;
    const digits = number.replace(/\D/g, "");
    window.open(`${digits ? `https://wa.me/${digits}` : "https://wa.me/"}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    setOpen(false);
  }
  return <>
    <button type="button" onClick={() => setOpen(true)} className="text-left hover:text-white">{label}</button>
    {open && <div className="fixed inset-0 z-[100] grid place-items-center bg-black/55 p-4" role="dialog" aria-modal="true">
      <form onSubmit={send} className="w-full max-w-lg rounded-3xl bg-white p-7 text-slate-900 shadow-2xl">
        <h2 className="text-2xl font-black text-forest">Ecrire a NutVitaGlobalis</h2>
        <p className="mt-2 text-sm text-slate-500">Votre message sera ouvert dans WhatsApp et adresse au numero configure par l'administration.</p>
        <textarea name="message" required minLength={2} rows={6} autoFocus className="admin-input mt-5 resize-none" placeholder="Votre message..." />
        <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)} className="btn-secondary">Annuler</button><button className="btn-primary">Envoyer sur WhatsApp</button></div>
      </form>
    </div>}
  </>;
}
