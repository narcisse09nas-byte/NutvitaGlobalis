"use client";

import { FormEvent, useState } from "react";
import { usePathname } from "next/navigation";
import { normalizeLocale, stripLocale } from "@/lib/i18n";

export default function ContactForm() {
  const english = normalizeLocale(stripLocale(usePathname()).locale) === "en";
  const tx = (fr: string, en: string) => english ? en : fr;
  const [status, setStatus] = useState<{ type: "idle" | "loading" | "success" | "error"; message?: string }>({ type: "idle" });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; setStatus({ type: "loading" });
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      const result = await response.json(); if (!response.ok) throw new Error(result.message); form.reset();
      setStatus({ type: "success", message: tx("Votre message a bien ete envoye.", "Your message has been sent successfully.") });
    } catch {
      setStatus({ type: "error", message: tx("Une erreur est survenue. Veuillez reessayer.", "Something went wrong. Please try again.") });
    }
  }
  return <form onSubmit={submit} className="card grid gap-5 p-7 md:p-10">
    <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
    <div className="grid gap-5 sm:grid-cols-2"><label className="grid gap-2 text-sm font-bold">{tx("Nom complet", "Full name")}<input name="name" required minLength={2} maxLength={100} className="rounded-xl border border-slate-200 bg-cream px-4 py-3 outline-none focus:border-leaf" placeholder={tx("Votre nom", "Your name")} /></label><label className="grid gap-2 text-sm font-bold">Email<input name="email" required type="email" className="rounded-xl border border-slate-200 bg-cream px-4 py-3 outline-none focus:border-leaf" placeholder="you@email.com" /></label></div>
    <label className="grid gap-2 text-sm font-bold">{tx("Sujet", "Subject")}<select name="subject" className="rounded-xl border border-slate-200 bg-cream px-4 py-3 outline-none"><option>{tx("Demande d'information", "Information request")}</option><option>{tx("Formation", "Course")}</option><option>{tx("Teleconseil", "Nutrition counselling")}</option><option>{tx("Partenariat", "Partnership")}</option></select></label>
    <label className="grid gap-2 text-sm font-bold">Message<textarea name="message" required minLength={10} maxLength={5000} rows={6} className="resize-none rounded-xl border border-slate-200 bg-cream px-4 py-3 outline-none focus:border-leaf" placeholder={tx("Comment pouvons-nous vous aider ?", "How can we help you?")} /></label>
    {status.message && <p role="status" className={`rounded-xl p-4 text-sm font-semibold ${status.type === "success" ? "bg-mint text-forest" : "bg-red-50 text-red-700"}`}>{status.message}</p>}
    <button disabled={status.type === "loading"} className="btn-primary justify-self-start disabled:cursor-wait disabled:opacity-60" type="submit">{status.type === "loading" ? tx("Envoi...", "Sending...") : tx("Envoyer le message", "Send message")}</button>
  </form>;
}