"use client";

import { useState } from "react";
import { PlusIcon, SparklesIcon, TrashIcon } from "@heroicons/react/24/outline";

type Item = { id: string; meal: string; food: string; quantity: string; unit: string };
const blank = (): Item => ({ id: crypto.randomUUID(), meal: "breakfast", food: "", quantity: "", unit: "g" });

export default function Nutrition24hAssessment({ clientId, partnerId, locale = "fr", onAnalyzed }: { clientId: string; partnerId: string; locale?: "fr" | "en"; onAnalyzed?: (value: any) => void }) {
  const t = (fr: string, en: string) => locale === "en" ? en : fr;
  const [items, setItems] = useState<Item[]>([blank()]);
  const [result, setResult] = useState<any>(null), [loading, setLoading] = useState(false), [message, setMessage] = useState("");
  const update = (id: string, key: keyof Item, value: string) => setItems(rows => rows.map(row => row.id === id ? { ...row, [key]: value } : row));
  async function analyze() {
    setLoading(true); setMessage("");
    const response = await fetch("/api/consultations/nutrition-24h", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client_id: clientId, partner_id: partnerId, locale, meals: items.map(({ meal, food, quantity, unit }) => ({ meal, food, quantity: Number(quantity), unit })) }) });
    const data = await response.json(); setLoading(false);
    if (!response.ok) { setMessage(data.message || t("Analyse impossible.", "Analysis failed.")); return; }
    setResult(data.analysis); onAnalyzed?.(data.analysis);
  }
  return <section className="rounded-2xl border bg-white p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-black">{t("Estimation nutritionnelle sur 24 heures", "24-hour nutrition assessment")}</h3><p className="mt-1 text-sm text-slate-500">{t("Renseignez chaque aliment, sa quantité et son unité. L’IA estime les nutriments et explicite ses limites.", "Enter each food, quantity and unit. AI estimates nutrients and explains its limitations.")}</p></div><button type="button" onClick={() => setItems(rows => [...rows, blank()])} className="btn-secondary px-4 py-2"><PlusIcon className="mr-2 h-4"/>{t("Ajouter une ligne", "Add row")}</button></div>
    <div className="mt-5 overflow-x-auto"><table className="min-w-[760px] w-full text-sm"><thead><tr className="border-b text-left text-slate-500"><th className="p-2">{t("Repas", "Meal")}</th><th className="p-2">{t("Aliment ou préparation", "Food or recipe")}</th><th className="p-2">{t("Quantité", "Quantity")}</th><th className="p-2">{t("Unité", "Unit")}</th><th className="p-2">{t("Action", "Action")}</th></tr></thead><tbody>{items.map(row => <tr key={row.id} className="border-b"><td className="p-2"><select value={row.meal} onChange={e => update(row.id, "meal", e.target.value)} className="admin-input"><option value="breakfast">{t("Petit-déjeuner", "Breakfast")}</option><option value="lunch">{t("Déjeuner", "Lunch")}</option><option value="dinner">{t("Dîner", "Dinner")}</option><option value="snack">{t("Collation", "Snack")}</option><option value="drink">{t("Boisson", "Drink")}</option></select></td><td className="p-2"><input value={row.food} onChange={e => update(row.id, "food", e.target.value)} className="admin-input" placeholder={t("Ex. riz cuit, sauce arachide", "e.g. cooked rice, peanut sauce")}/></td><td className="p-2"><input value={row.quantity} onChange={e => update(row.id, "quantity", e.target.value)} type="number" min="0" step="0.1" className="admin-input"/></td><td className="p-2"><input value={row.unit} onChange={e => update(row.id, "unit", e.target.value)} className="admin-input" placeholder="g, ml, tasse..."/></td><td className="p-2"><button type="button" onClick={() => setItems(rows => rows.length > 1 ? rows.filter(x => x.id !== row.id) : rows)} className="rounded-lg p-2 text-red-600"><TrashIcon className="h-5"/></button></td></tr>)}</tbody></table></div>
    <button type="button" disabled={loading || !clientId} onClick={analyze} className="btn-primary mt-5"><SparklesIcon className="mr-2 h-5"/>{loading ? t("Analyse en cours…", "Analyzing…") : t("Analyser les apports", "Analyze intake")}</button>{message && <p className="mt-3 text-sm text-red-600">{message}</p>}
    {result && <div className="mt-6 grid gap-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[["kcal","kcal"],["protein_g",t("g protéines","g protein")],["carbohydrate_g",t("g glucides","g carbs")],["fat_g",t("g lipides","g fat")],["fiber_g",t("g fibres","g fiber")]].map(([key,label]) => <div key={key} className="rounded-xl bg-mint p-4"><b className="text-xl">{Math.round(Number(result.totals?.[key] || 0) * 10) / 10}</b><p className="text-xs text-slate-600">{label}</p></div>)}</div><div className="grid gap-4 md:grid-cols-2"><article className="rounded-xl bg-slate-50 p-4"><h4 className="font-black">{t("Commentaire professionnel", "Professional comment")}</h4><p className="mt-2 text-sm leading-6">{result.professional_comment}</p></article><article className="rounded-xl bg-slate-50 p-4"><h4 className="font-black">{t("Recommandations", "Recommendations")}</h4><ul className="mt-2 grid gap-2 text-sm">{result.recommendations?.map((x: string, i: number) => <li key={i}>• {x}</li>)}</ul></article></div></div>}
  </section>;
}
