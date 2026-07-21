"use client";

import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

export type LabParameter = { name: string; value: string; unit: string; normalMin: string; normalMax: string };

export const defaultLabParameters: LabParameter[] = [
  ["Glycémie", "g/L"], ["HbA1c", "%"], ["Cholestérol total", "g/L"], ["HDL", "g/L"],
  ["LDL", "g/L"], ["Triglycérides", "g/L"], ["Hémoglobine", "g/dL"], ["Ferritine", "ng/mL"],
  ["Albumine", "g/L"], ["CRP", "mg/L"],
].map(([name, unit]) => ({ name, unit, value: "", normalMin: "", normalMax: "" }));

export function serializeLabParameters(items: LabParameter[]) {
  return Object.fromEntries(items.filter(item => item.name.trim() && item.value !== "").map(item => [item.name.trim(), {
    value: Number(item.value), unit: item.unit.trim(),
    normal_min: item.normalMin === "" ? null : Number(item.normalMin),
    normal_max: item.normalMax === "" ? null : Number(item.normalMax),
  }]));
}

export default function LabParameterEditor({ items, onChange, locale = "fr" }: { items: LabParameter[]; onChange: (items: LabParameter[]) => void; locale?: "fr" | "en" }) {
  const en = locale === "en";
  const update = (index: number, patch: Partial<LabParameter>) => onChange(items.map((item, current) => current === index ? { ...item, ...patch } : item));
  return <div className="rounded-3xl border border-leaf/20 bg-gradient-to-br from-mint/70 to-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-black text-forest">{en ? "Laboratory parameters" : "Paramètres biologiques et sanguins"}</h3><p className="mt-1 text-sm text-slate-600">{en ? "Enter the unit and the laboratory reference interval shown on the report." : "Renseignez l’unité et l’intervalle de référence indiqué par le laboratoire."}</p></div><button type="button" className="btn-secondary px-4 py-2" onClick={() => onChange([...items, { name: "", value: "", unit: "", normalMin: "", normalMax: "" }])}><PlusIcon className="mr-2 h-4"/>{en ? "Add" : "Ajouter"}</button></div>
    <div className="mt-5 grid gap-3">{items.map((item, index) => <div key={`${item.name}-${index}`} className="grid gap-3 rounded-2xl border border-forest/10 bg-white p-3 shadow-sm md:grid-cols-[1.3fr_.7fr_.7fr_.7fr_.7fr_auto]">
      <input aria-label={en ? "Parameter" : "Paramètre"} className="admin-input" placeholder={en ? "Parameter" : "Paramètre"} value={item.name} onChange={event => update(index, { name: event.target.value })}/>
      <input aria-label={en ? "Value" : "Valeur"} className="admin-input" type="number" step="any" placeholder={en ? "Value" : "Valeur"} value={item.value} onChange={event => update(index, { value: event.target.value })}/>
      <input aria-label={en ? "Unit" : "Unité"} className="admin-input" placeholder={en ? "Unit" : "Unité"} value={item.unit} onChange={event => update(index, { unit: event.target.value })}/>
      <input aria-label="Minimum" className="admin-input" type="number" step="any" placeholder="Min" value={item.normalMin} onChange={event => update(index, { normalMin: event.target.value })}/>
      <input aria-label="Maximum" className="admin-input" type="number" step="any" placeholder="Max" value={item.normalMax} onChange={event => update(index, { normalMax: event.target.value })}/>
      <button type="button" aria-label={en ? "Delete" : "Supprimer"} className="grid h-11 w-11 place-items-center rounded-xl bg-red-50 text-red-600 transition hover:bg-red-100" onClick={() => onChange(items.filter((_, current) => current !== index))}><TrashIcon className="h-5"/></button>
    </div>)}</div>
  </div>;
}
