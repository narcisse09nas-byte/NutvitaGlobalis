"use client";

import { FormEvent, useState } from "react";

export default function Newsletter() {
  const [status, setStatus] = useState<{ loading: boolean; message?: string; success?: boolean }>({ loading: false });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus({ loading: true });
    const payload = Object.fromEntries(new FormData(form));
    try {
      const response = await fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      form.reset();
      setStatus({ loading: false, success: true, message: result.message });
    } catch (error) {
      setStatus({ loading: false, success: false, message: error instanceof Error ? error.message : "Une erreur est survenue." });
    }
  }

  return <section className="section"><div className="container-site"><div className="rounded-[2rem] bg-forest px-6 py-12 text-center text-white md:px-16"><p className="mb-3 text-sm font-bold uppercase tracking-widest text-orange">La lettre NutVita</p><h2 className="text-3xl font-black text-white md:text-4xl">Des conseils fiables, directement dans votre boîte mail.</h2><p className="mx-auto mt-4 max-w-xl text-white/65">Un email utile par semaine. Désinscription possible à tout moment.</p><form onSubmit={submit} className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row"><input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true"/><input name="email" type="email" required placeholder="Votre adresse email" className="min-w-0 flex-1 rounded-full bg-white px-5 py-4 text-slate-800 outline-none"/><button disabled={status.loading} className="btn-primary disabled:cursor-wait disabled:opacity-60" type="submit">{status.loading ? "Inscription…" : "Je m’inscris"}</button></form>{status.message && <p role="status" className={`mx-auto mt-4 max-w-xl text-sm font-semibold ${status.success ? "text-mint" : "text-orange"}`}>{status.message}</p>}</div></div></section>;
}
