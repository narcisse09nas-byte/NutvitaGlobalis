"use client";

import { FormEvent, useState } from "react";

export default function ContactForm() {
  const [status, setStatus] = useState<{ type: "idle" | "loading" | "success" | "error"; message?: string }>({ type: "idle" });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus({ type: "loading" });
    const payload = Object.fromEntries(new FormData(form));
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      form.reset();
      setStatus({ type: "success", message: result.message });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Une erreur est survenue." });
    }
  }

  return <form onSubmit={submit} className="card grid gap-5 p-7 md:p-10">
    <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="grid gap-2 text-sm font-bold">Nom complet<input name="name" required minLength={2} maxLength={100} className="rounded-xl border border-slate-200 bg-cream px-4 py-3 outline-none focus:border-leaf" placeholder="Votre nom" /></label>
      <label className="grid gap-2 text-sm font-bold">Email<input name="email" required type="email" className="rounded-xl border border-slate-200 bg-cream px-4 py-3 outline-none focus:border-leaf" placeholder="vous@email.com" /></label>
    </div>
    <label className="grid gap-2 text-sm font-bold">Sujet<select name="subject" className="rounded-xl border border-slate-200 bg-cream px-4 py-3 outline-none"><option>Demande d'information</option><option>Formation</option><option>Teleconseil</option><option>Partenariat</option></select></label>
    <label className="grid gap-2 text-sm font-bold">Message<textarea name="message" required minLength={10} maxLength={5000} rows={6} className="resize-none rounded-xl border border-slate-200 bg-cream px-4 py-3 outline-none focus:border-leaf" placeholder="Comment pouvons-nous vous aider ?" /></label>
    {status.message && <p role="status" className={`rounded-xl p-4 text-sm font-semibold ${status.type === "success" ? "bg-mint text-forest" : "bg-red-50 text-red-700"}`}>{status.message}</p>}
    <button disabled={status.type === "loading"} className="btn-primary justify-self-start disabled:cursor-wait disabled:opacity-60" type="submit">{status.type === "loading" ? "Envoi..." : "Envoyer le message"}</button>
  </form>;
}
