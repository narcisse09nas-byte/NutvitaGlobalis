"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { displayMoney } from "@/lib/currency";

type Row = Record<string, any>;

const periodLabel = (months: number) => months === 1 ? "Mensuel" : months === 3 ? "Trimestriel" : "Annuel";

export default function SubscriptionPlans({ plans, current, invoices = [] }: { plans: Row[]; current: Row | null; taxRate: number; invoices?: Row[] }) {
  const [loading, setLoading] = useState("");
  const [message, setMessage] = useState("");

  function checkout(plan: string) {
    setLoading(plan);
    location.href = `/checkout?type=subscription&id=${encodeURIComponent(plan)}`;
  }

  async function invoice(path: string) {
    const { data, error } = await createClient().storage.from("document-vault").createSignedUrl(path, 180);
    if (error) setMessage(error.message);
    else window.open(data.signedUrl, "_blank");
  }

  return (
    <div className="grid gap-6">
      {current && (
        <div className="rounded-2xl bg-mint p-5">
          <b>Abonnement actuel : {current.subscription_plans?.name || current.plan_id}</b>
          <div className="mt-2 grid gap-1 text-sm sm:grid-cols-3">
            <span>Statut : {current.status}</span>
            <span>Debut : {current.started_at ? new Date(current.started_at).toLocaleDateString("fr-FR") : "En attente"}</span>
            <span>Expiration : {current.expires_at ? new Date(current.expires_at).toLocaleDateString("fr-FR") : "En attente"}</span>
          </div>
        </div>
      )}

      <p className="rounded-2xl bg-mint p-4 text-sm font-bold text-forest">
        Les paiements sont temporairement suspendus pendant la finalisation juridique de l'entreprise. Tous les services peuvent etre actives gratuitement pour l'instant, apres creation du compte.
      </p>

      {message && <p className="rounded-xl bg-amber-50 p-4 text-amber-900">{message}</p>}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {plans.map(plan => {
          const duration = Number(plan.duration_months || 12);
          const period = periodLabel(duration);
          const isCurrent = current?.plan_id === plan.id && current?.status === "active";
          return (
            <article key={plan.id} className={`rounded-3xl border bg-white p-6 ${plan.tier === "premium" ? "border-orange shadow-soft" : ""}`}>
              <p className="text-xs font-bold uppercase text-leaf">{plan.tier === "premium" ? "Premium" : "Basic"} - {period}</p>
              <h2 className="mt-2 text-2xl font-black">{plan.name}</h2>
              <div className="my-5 grid gap-2 rounded-2xl bg-slate-50 p-4 text-sm">
                <Line label="Prix actuel" value="Gratuit temporairement" strong />
                <Line label="Duree" value={`${duration} mois`} />
                <Line label="Renouvellement" value={period} />
                <p className="text-xs text-slate-500">Les conditions commerciales definitives seront publiees avant toute facturation.</p>
              </div>
              <ul className="my-5 grid gap-2 text-sm">{(plan.features || []).map((feature: string) => <li key={feature}>+ {feature}</li>)}</ul>
              <button disabled={loading === plan.id} onClick={() => checkout(plan.id)} className="btn-primary w-full">
                {loading === plan.id ? "Activation..." : isCurrent ? "Etendre gratuitement" : "Activer gratuitement"}
              </button>
            </article>
          );
        })}
      </div>

      {invoices.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-black">Mes factures</h2>
          <div className="grid gap-3">
            {invoices.map(item => (
              <button key={item.id} onClick={() => invoice(item.file_path)} className="flex justify-between rounded-xl border bg-white p-4 text-left">
                <span>{item.invoice_number}</span>
                <b>{displayMoney(Number(item.total_including_tax), item.currency)}</b>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex justify-between ${strong ? "border-t pt-2 text-lg" : ""}`}><span>{label}</span><b className={strong ? "text-forest" : ""}>{value}</b></div>;
}
