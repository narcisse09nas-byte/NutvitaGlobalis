"use client";
import { useMemo, useState } from "react";
import { formatUsd, xofToUsd } from "@/lib/currency";

type Row = Record<string, any>;

export default function ServiceCatalog({ plans, packs, courses, children, taxRate, initialFilter = "all" }: { plans: Row[]; packs: Row[]; courses: Row[]; children: Row[]; taxRate: number; initialFilter?: string }) {
  const [filter, setFilter] = useState(initialFilter);
  const [selectedChild, setSelectedChild] = useState(children[0]?.id || "");
  const premiumPlus=["Analyse intelligente de vos donnees de sante","Visualisation claire et automatique de votre progression","Accompagnement trimestriel par un teleconseiller qualifie","Acces aux articles et ressources premium","Suivi utilisable sur ordinateur et smartphone"];
  const services = useMemo(() => [
    ...plans.map(plan => {
      const premium=plan.tier === "premium";
      return { id: plan.id, kind: "subscription", group: plan.service_type, title: plan.name, price: Number(plan.price_excluding_tax ?? plan.amount), features: premium?[...(plan.features || []),...premiumPlus]:(plan.features || []), premium, billingLabel: "Paiement annuel, renouvelable chaque annee" };
    }),
    ...packs.map(pack => ({ id: pack.id, kind: "consultation", group: "packs", title: `Pack ${pack.name}`, price: Number(pack.price || 15000), features: ["Bilan nutritionnel personnalise", "Plan d'action individualise", "Suivi personnalise", "Chat securise avec votre expert", "Teleconsultations video", "Tableau de bord de suivi", "Rapports et recommandations"], premium: true, billingLabel: "Suivi de 3 mois, renouvelable" })),
    ...courses.map(course => ({ id: course.id, kind: "formation", group: "formations", title: course.title, price: Number(course.price || 50000), features: ["Formation certifiante premium", "Acces au corps enseignant par appel video jusqu'a 5 fois par certificat", "Messagerie avec les enseignants", "Acces aux articles premium", "Certificat de fin de formation"], premium: true, billingLabel: "Acces formation premium" })),
  ], [plans, packs, courses]);
  const rows = filter === "all" ? services : services.filter(item => item.group === filter);
  function checkout(item: any) {
    const childParam = item.group === "child_growth" && selectedChild ? `&child_id=${encodeURIComponent(selectedChild)}` : "";
    location.href = `/checkout?type=${item.kind}&id=${encodeURIComponent(item.id)}${childParam}`;
  }
  return <div className="grid gap-6">
    <div className="flex flex-wrap gap-2">{[["all","Tous"],["health_tracking","Suivi sante"],["child_growth","Croissance enfant"],["packs","Packs"],["formations","Formations"]].map(([value,label])=><button key={value} onClick={()=>setFilter(value)} className={`rounded-full px-4 py-2 text-sm font-bold ${filter===value?"bg-forest text-white":"bg-white text-forest"}`}>{label}</button>)}</div>
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{rows.map(item => { const tax = Math.round(item.price * taxRate) / 100, total = item.price + tax; return <article key={`${item.kind}-${item.id}`} className={`rounded-2xl border bg-white p-6 ${item.premium ? "border-orange" : ""}`}>
      <p className="text-xs font-bold uppercase text-leaf">{item.premium ? "Premium" : "Standard"}</p>
      <h2 className="mt-2 text-2xl font-black">{item.title}</h2>
      <p className="mt-3 rounded-full bg-mint px-4 py-2 text-xs font-black text-forest">{item.billingLabel}</p>
      <div className="my-5 grid gap-2 rounded-xl bg-slate-50 p-4 text-sm"><Line label="Prix HT" value={formatUsd(xofToUsd(item.price))}/><Line label={`Taxe (${taxRate} %)`} value={formatUsd(xofToUsd(tax))}/><Line label="Total TTC" value={formatUsd(xofToUsd(total))} strong/></div>
      <ul className="my-5 grid gap-2 text-sm">{item.features.map((feature:string)=><li key={feature}>+ {feature}</li>)}</ul>
      {item.group === "child_growth" && <div className="mb-4">
        {children.length ? <label className="grid gap-2 text-sm font-bold">Enfant concerne
          <select className="admin-input" value={selectedChild} onChange={e=>setSelectedChild(e.target.value)}>
            {children.map(child=><option key={child.id} value={child.id}>{[child.first_name,child.last_name].filter(Boolean).join(" ")||"Enfant"}</option>)}
          </select>
        </label> : <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Vous pouvez acheter ce suivi maintenant. Apres activation, vous ajouterez l'enfant a suivre dans l'espace croissance.</p>}
      </div>}
      <button onClick={()=>checkout(item)} className="btn-primary w-full">Choisir ce service</button>
    </article>})}</div>
    {!rows.length && <p className="rounded-2xl bg-white p-8 text-slate-500">Aucun service disponible dans cette categorie.</p>}
  </div>;
}

function Line({label,value,strong=false}:{label:string;value:string;strong?:boolean}){return <div className={`flex justify-between ${strong?"border-t pt-2 text-lg text-forest":""}`}><span>{label}</span><b>{value}</b></div>}
