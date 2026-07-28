"use client";

import { useMemo, useState } from "react";
import { ClipboardDocumentCheckIcon, SparklesIcon } from "@heroicons/react/24/outline";
import {
  calculateExchangePlan,
  formatMealPlanForRecord,
  WORLD_REGIONS,
  type WorldRegionKey,
} from "@/lib/regional-meal-planner";

type Props = {
  onUsePlan?: (text: string) => void;
};

export default function RegionalMealPlanner({ onUsePlan }: Props) {
  const [region, setRegion] = useState<WorldRegionKey>("west_central_africa");
  const [kcal, setKcal] = useState(2000);
  const [carbs, setCarbs] = useState(50);
  const [protein, setProtein] = useState(20);
  const [fat, setFat] = useState(30);
  const [menuCount, setMenuCount] = useState(15);
  const [mealsPerDay, setMealsPerDay] = useState(5);
  const [restrictions, setRestrictions] = useState("");
  const [clinicalContext, setClinicalContext] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const preview = useMemo(
    () => calculateExchangePlan({ kcal, carbohydratePercent: carbs, proteinPercent: protein, fatPercent: fat }),
    [kcal, carbs, protein, fat],
  );
  const percentageTotal = carbs + protein + fat;

  async function generate() {
    if (percentageTotal !== 100) {
      setMessage("La somme glucides + protéines + lipides doit être égale à 100 %.");
      return;
    }
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/consultations/menu-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        region, kcal, carbohydratePercent: carbs, proteinPercent: protein, fatPercent: fat,
        menuCount, mealsPerDay, restrictions, clinicalContext, locale: "fr",
      }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(data.message || "Génération impossible.");
      return;
    }
    setResult(data);
    setMessage(data.cached ? "Menus chargés depuis le cache validable." : "Menus générés. Vérifiez-les avant utilisation.");
  }

  async function copyOrUse() {
    if (!result) return;
    const text = formatMealPlanForRecord(result);
    if (onUsePlan) onUsePlan(text);
    await navigator.clipboard?.writeText(text);
    setMessage(onUsePlan ? "Plan ajouté à la consultation et copié." : "Plan copié.");
  }

  return (
    <section className="rounded-3xl border border-leaf/20 bg-gradient-to-br from-white to-mint/40 p-5 shadow-soft md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-orange">Outil professionnel</p>
          <h2 className="mt-2 text-2xl font-black text-forest">Planificateur régional par équivalents</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Le nutritionniste fixe l’énergie et les macronutriments. Le moteur calcule les portions, puis compose des menus avec les aliments de la région sélectionnée.
          </p>
        </div>
        <span className="rounded-full bg-forest px-4 py-2 text-xs font-black text-white">Validation humaine obligatoire</span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Field label="Région alimentaire">
          <select className="admin-input" value={region} onChange={event => setRegion(event.target.value as WorldRegionKey)}>
            {Object.entries(WORLD_REGIONS).map(([key, item]) => <option key={key} value={key}>{item.fr}</option>)}
          </select>
        </Field>
        <Field label="Énergie prescrite (kcal/j)">
          <input className="admin-input" type="number" min="800" max="5000" step="50" value={kcal} onChange={event => setKcal(Number(event.target.value))}/>
        </Field>
        <Field label="Nombre de menus">
          <input className="admin-input" type="number" min="1" max="15" value={menuCount} onChange={event => setMenuCount(Number(event.target.value))}/>
        </Field>
        <Field label="Prises alimentaires/jour">
          <select className="admin-input" value={mealsPerDay} onChange={event => setMealsPerDay(Number(event.target.value))}>
            {[3, 4, 5, 6].map(value => <option key={value}>{value}</option>)}
          </select>
        </Field>
        <Field label="Glucides (%)">
          <input className="admin-input" type="number" min="20" max="75" value={carbs} onChange={event => setCarbs(Number(event.target.value))}/>
        </Field>
        <Field label="Protéines (%)">
          <input className="admin-input" type="number" min="10" max="40" value={protein} onChange={event => setProtein(Number(event.target.value))}/>
        </Field>
        <Field label="Lipides (%)">
          <input className="admin-input" type="number" min="15" max="45" value={fat} onChange={event => setFat(Number(event.target.value))}/>
        </Field>
        <div className={`rounded-2xl p-4 text-sm font-black ${percentageTotal === 100 ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-800"}`}>
          Total macronutriments<br/><span className="text-2xl">{percentageTotal} %</span>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field label="Allergies, exclusions, préférences et aliments indisponibles">
          <textarea className="admin-input" rows={3} value={restrictions} onChange={event => setRestrictions(event.target.value)} placeholder="Ex. allergie à l'arachide, sans porc, végétarien…"/>
        </Field>
        <Field label="Contexte clinique à respecter">
          <textarea className="admin-input" rows={3} value={clinicalContext} onChange={event => setClinicalContext(event.target.value)} placeholder="Ex. texture modifiée, restriction sodée prescrite…"/>
        </Field>
      </div>

      <div className="mt-5 rounded-2xl bg-white p-5">
        <h3 className="font-black text-forest">Calcul d’équivalents proposé</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
          {Object.entries(preview.exchanges).map(([key, value]) => (
            <div key={key} className="rounded-xl bg-slate-50 p-3"><b className="capitalize">{groupLabels[key] || key}</b><p className="mt-1 text-xl font-black text-orange">{value}</p></div>
          ))}
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Repère calculé selon le canevas fourni : 15 g de glucides par équivalent féculent/fruit, 7 g de protéines par équivalent protéique et 5 g de lipides par équivalent gras. Le professionnel peut adapter la prescription.
        </p>
      </div>

      <button type="button" onClick={generate} disabled={loading || percentageTotal !== 100} className="btn-primary mt-5">
        <SparklesIcon className="mr-2 h-5"/>{loading ? "Construction des menus…" : `Construire ${menuCount} menus régionaux`}
      </button>
      {message && <p className="mt-4 rounded-xl bg-white p-4 text-sm font-bold text-forest">{message}</p>}

      {result && (
        <div className="mt-6 grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="text-xl font-black">{result.regionLabel} · {result.exchangePlan.kcal} kcal/j</h3><p className="text-sm text-slate-500">{result.menus.length} menu(s) · moteur {result.provider}</p></div>
            <button type="button" onClick={copyOrUse} className="btn-secondary"><ClipboardDocumentCheckIcon className="mr-2 h-5"/>{onUsePlan ? "Utiliser dans la consultation" : "Copier le plan"}</button>
          </div>
          <p className="rounded-xl border border-orange/30 bg-orange/10 p-4 text-sm font-bold text-slate-700">{result.warning}</p>
          <div className="grid gap-4 xl:grid-cols-2">
            {result.menus.map((day: any, index: number) => (
              <article key={`${day.title}-${index}`} className="rounded-2xl border bg-white p-5">
                <h4 className="font-black text-forest">{day.title}</h4>
                <div className="mt-3 grid gap-3">
                  {day.meals.map((meal: any, mealIndex: number) => (
                    <div key={`${meal.name}-${mealIndex}`} className="rounded-xl bg-slate-50 p-3">
                      <b className="text-sm">{meal.name}</b>
                      <ul className="mt-2 grid gap-1 text-xs leading-5 text-slate-600">
                        {meal.items.map((item: any, itemIndex: number) => <li key={`${item.food}-${itemIndex}`}>• {item.food} — {item.rawGrams} g cru / {item.servedGrams} g servi ({item.householdMeasure}; {item.exchanges} équiv.)</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs italic text-slate-500">{day.professionalNote}</p>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

const groupLabels: Record<string, string> = {
  starch: "Féculents", fruit: "Fruits", dairy: "Laitages", protein: "Protéines", fat: "Matières grasses", vegetable: "Légumes",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-bold">{label}{children}</label>;
}
