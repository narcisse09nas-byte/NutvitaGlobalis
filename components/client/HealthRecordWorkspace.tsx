"use client";

import Image from "next/image";
import Link from "next/link";
import { ChartBarIcon, HeartIcon, SparklesIcon } from "@heroicons/react/24/outline";
import NutritionRecord from "@/components/client/NutritionRecord";
import type { HealthRecordPageSettings } from "@/data/health-record-page";

type Row = Record<string, any>;

export default function HealthRecordWorkspace(props: {
  clientId: string; anthropometry: Row[]; biology: Row[]; food: Row[]; lifestyle: Row[];
  consultations: Row[]; dietary: Row[]; locale: "fr" | "en"; settings: HealthRecordPageSettings;
}) {
  const { locale, settings, anthropometry } = props;
  const en = locale === "en";
  const t = (fr: string, english: string) => en ? english : fr;
  const latest = anthropometry[0] || {};
  const previous = anthropometry[1] || {};
  const indicators = [
    [t("Poids", "Weight"), latest.weight_kg, previous.weight_kg, "kg"],
    ["IMC", latest.bmi, previous.bmi, ""],
    [t("Tour de taille", "Waist"), latest.waist_cm, previous.waist_cm, "cm"],
    [t("Masse grasse", "Body fat"), latest.body_fat_percent, previous.body_fat_percent, "%"],
    [t("Masse musculaire", "Muscle mass"), latest.muscle_mass_kg, previous.muscle_mass_kg, "kg"],
  ].filter((item) => item[1] != null);

  return <div>
    <div className="mb-6">
      <h1 className="text-3xl font-black tracking-tight text-forest lg:text-4xl">{en ? settings.page_title_en : settings.page_title}</h1>
      <p className="mt-2 text-slate-500">{en ? settings.page_intro_en : settings.page_intro}</p>
    </div>
    <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 [&>div>div:first-child]:rounded-2xl [&_form]:shadow-sm [&_table]:text-[13px]">
        <NutritionRecord {...props}/>
      </div>
      <aside className="grid gap-4 2xl:sticky 2xl:top-24">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-black text-forest">{t("Aperçu de vos indicateurs", "Your indicators at a glance")}</h2>
          <p className="mt-1 text-xs text-slate-400">{t("Dernière mesure", "Latest measurement")} · {latest.measured_at ? new Date(latest.measured_at).toLocaleDateString(en ? "en-GB" : "fr-FR") : "—"}</p>
          <div className="mt-4 divide-y">
            {indicators.map(([label, value, oldValue, unit], index) => {
              const delta = Number(value) - Number(oldValue);
              return <div key={String(label)} className="grid grid-cols-[36px_1fr_auto_80px] items-center gap-2 py-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-mint text-leaf"><ChartBarIcon className="h-5 w-5"/></span>
                <b className="text-xs text-forest">{String(label)}</b>
                <span className="text-right"><b className="block text-sm text-forest">{String(value)} {String(unit)}</b>{oldValue != null && <small className={delta <= 0 || index === 4 ? "text-emerald-600" : "text-orange"}>{delta > 0 ? "+" : ""}{delta.toFixed(1)} {String(unit)}</small>}</span>
                <MiniSpark seed={index}/>
              </div>;
            })}
            {!indicators.length && <p className="py-6 text-center text-sm text-slate-400">{t("Ajoutez votre première mesure pour afficher cet aperçu.", "Add your first measurement to display this overview.")}</p>}
          </div>
          <Link href="/espace-client/tendances" className="mt-3 flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-black text-forest"><ChartBarIcon className="h-4 w-4"/>{t("Voir tous les graphiques", "View all charts")}</Link>
        </section>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-black text-forest">{en ? settings.objective_title_en : settings.objective_title}</h2>
          <p className="mt-3 text-sm font-black text-forest">{t("Améliorer durablement votre santé", "Improve your health sustainably")}</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-[63%] rounded-full bg-leaf"/></div>
          <div className="mt-2 flex justify-between text-xs text-slate-500"><span>{t("Progression personnalisée", "Personalized progress")}</span><b>63%</b></div>
          <Link href="/espace-client/objectifs" className="mt-4 block rounded-xl border py-2 text-center text-xs font-black text-forest">{t("Voir mes objectifs", "View my goals")}</Link>
        </section>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-black text-forest">{en ? settings.advice_title_en : settings.advice_title}</h2>
          <div className="mt-3 grid gap-2">{settings.advice.map((item, index) => <article key={`${item.title}-${index}`} className="flex gap-3 rounded-2xl border p-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-mint text-leaf">{index === 1 ? <SparklesIcon className="h-5 w-5"/> : <HeartIcon className="h-5 w-5"/>}</span><div><h3 className="text-xs font-black text-forest">{en ? item.title_en : item.title}</h3><p className="mt-1 text-[11px] leading-4 text-slate-500">{en ? item.text_en : item.text}</p></div></article>)}</div>
        </section>
        <section className="overflow-hidden rounded-3xl border border-mint bg-[#f3faf6] p-5 shadow-sm">
          <h2 className="font-black text-forest">{en ? settings.guide_title_en : settings.guide_title}</h2>
          <p className="mt-2 text-xs leading-5 text-slate-500">{en ? settings.guide_text_en : settings.guide_text}</p>
          <div className="relative mt-3 aspect-[16/10]"><Image src={settings.guide_image_url} alt="" fill unoptimized className="object-contain" sizes="300px"/></div>
        </section>
      </aside>
    </div>
  </div>;
}

function MiniSpark({seed}:{seed:number}) { const paths=["2,25 15,17 27,21 40,12 52,18 64,9 78,16","2,22 14,25 27,13 39,18 52,11 65,20 78,10","2,24 15,15 28,19 41,8 53,22 66,17 78,20"]; return <svg viewBox="0 0 80 32" className="h-8 w-20" aria-hidden="true"><polyline points={paths[seed%paths.length]} fill="none" stroke="#15803d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> }
