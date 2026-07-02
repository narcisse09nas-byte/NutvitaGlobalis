"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { displayMoney } from "@/lib/currency";

type Row = Record<string, any>;

const periodLabel = (months: number) => months === 1 ? "Mensuel" : months === 3 ? "Trimestriel" : "Annuel";

export default function SubscriptionPlans({ plans, subscriptions, children = [], invoices = [] }: { plans: Row[]; subscriptions: Row[]; children?: Row[]; taxRate: number; invoices?: Row[] }) {
  const [loading, setLoading] = useState("");
  const [message, setMessage] = useState("");
  const [selectedChild, setSelectedChild] = useState(children[0]?.id || "");

  function checkout(plan: Row) {
    setLoading(plan.id);
    const child = plan.service_type === "child_growth" && selectedChild ? `&child_id=${encodeURIComponent(selectedChild)}` : "";
    location.href = `/checkout?type=subscription&id=${encodeURIComponent(plan.id)}${child}`;
  }

  async function invoice(path: string) {
    const { data, error } = await createClient().storage.from("document-vault").createSignedUrl(path, 180);
    if (error) setMessage(error.message);
    else window.open(data.signedUrl, "_blank");
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-3">
        <h2 className="text-xl font-black">Services actifs et en attente</h2>
        {subscriptions.map(current => <article key={current.id} className="rounded-2xl bg-mint p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><b>{current.subscription_plans?.name || current.plan_id}</b><p className="mt-1 text-sm">{current.children?.full_name ? `Beneficiaire : ${current.children.full_name}` : "Beneficiaire : moi-meme"}</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase text-forest">{current.status}</span></div><div className="mt-3 grid gap-1 text-sm sm:grid-cols-2"><span>Debut : {current.started_at ? new Date(current.started_at).toLocaleDateString("fr-FR") : "En attente"}</span><span>Expiration : {current.expires_at ? new Date(current.expires_at).toLocaleDateString("fr-FR") : "En attente"}</span></div></article>)}
        {!subscriptions.length && <p className="rounded-2xl bg-white p-5 text-slate-500">Aucun abonnement actif.</p>}
      </section>

      <p className="rounded-2xl bg-mint p-4 text-sm font-bold text-forest">
        Les paiements sont temporairement suspendus pendant la finalisation juridique de l'entreprise. Tous les services peuvent etre actives gratuitement pour l'instant, apres creation du compte.
      </p>

      {message && <p className="rounded-xl bg-amber-50 p-4 text-amber-900">{message}</p>}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {plans.map(plan => {
          const duration = Number(plan.duration_months || 12);
          const period = periodLabel(duration);
          const childPlan = plan.service_type === "child_growth";
          const current = subscriptions.find(item => item.plan_id === plan.id && item.status === "active" && (!childPlan || item.child_id === selectedChild));
          const isCurrent = Boolean(current);
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
              {childPlan && <label className="mb-4 grid gap-2 text-sm font-bold">Beneficiaire<select value={selectedChild} onChange={event => setSelectedChild(event.target.value)} className="admin-input"><option value="">Ajouter ou choisir un enfant</option>{children.map(child => <option key={child.id} value={child.id}>{child.full_name}</option>)}</select></label>}
              <button disabled={loading === plan.id || (childPlan && !selectedChild)} onClick={() => checkout(plan)} className="btn-primary w-full">
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
