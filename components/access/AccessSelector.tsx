"use client";

import { useState } from "react";
import type { AccessChoice } from "@/lib/platform-access";

export default function AccessSelector({ choices, superAdmin, email }: { choices: AccessChoice[]; superAdmin: boolean; email: string }) {
  const [loading, setLoading] = useState("");
  const grouped = choices.reduce((result, choice) => {
    const items = result.get(choice.service) || [];
    items.push(choice);
    result.set(choice.service, items);
    return result;
  }, new Map<AccessChoice["service"], AccessChoice[]>());
  async function select(choice: AccessChoice) {
    setLoading(`${choice.service}:${choice.role}`);
    const response = await fetch("/api/access/select", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(choice) });
    const result = await response.json();
    if (response.ok) window.location.assign(result.href);
    else { alert(result.message || "Accès refusé."); setLoading(""); }
  }
  return <div className="grid gap-6">
    <div><p className="text-sm font-bold text-slate-500">{email}</p>{superAdmin && <p className="mt-2 inline-flex rounded-full bg-orange/10 px-3 py-1 text-xs font-black text-orange">Accès super-administrateur complet</p>}</div>
    {[...grouped.entries()].map(([service, items]) => <section key={service} className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-black text-forest">{items[0].label.split(" — ")[0]}</h2><div className="mt-4 flex flex-wrap gap-3">{items.map(choice => { const key=`${choice.service}:${choice.role}`; return <button key={key} disabled={Boolean(loading)} onClick={() => select(choice)} className="btn-secondary">{loading===key?"Ouverture...":choice.label.split(" — ")[1]}</button>; })}</div></section>)}
  </div>;
}
