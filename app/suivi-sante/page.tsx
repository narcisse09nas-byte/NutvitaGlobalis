import Link from "next/link";
import { ChartBarIcon, DocumentTextIcon, SparklesIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import ManagedPageHero from "@/components/ManagedPageHero";
import MedicalDisclaimer from "@/components/MedicalDisclaimer";
import { getClientEntitlements } from "@/lib/client";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getSitePage } from "@/lib/site-pages";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Suivi santé personnalisé" };
export default async function HealthTracking() {
  const [page, locale] = await Promise.all([getSitePage("suivi-sante"), getCurrentLocale()]);
  const english = locale === "en", supabase = await createClient(), { data: { user } } = await supabase.auth.getUser();
  const access = user ? await getClientEntitlements(supabase, user.id) : null;
  const { data: plans } = await supabase.from("subscription_plans").select("id,name,price,currency,service_type,tier,status").eq("status","active").in("service_type",["health_tracking","child_growth"]).order("price");
  const features = english ? [
    [ChartBarIcon, "Your trends", "Weight, BMI, blood glucose, cholesterol, blood pressure and lifestyle."],
    [SparklesIcon, "Careful AI analysis", "Your measurements, reference ranges and questionnaire answers are considered."],
    [DocumentTextIcon, "Private history", "Your measurements and reports stay in your secure workspace."],
    [UserGroupIcon, "Child growth", "A strictly separate record for every enrolled child."],
  ] as const : [
    [ChartBarIcon, "Vos tendances", "Poids, IMC, glycémie, cholestérol, tension artérielle et mode de vie."],
    [SparklesIcon, "Analyse IA prudente", "Vos mesures, plages de référence et réponses aux questionnaires sont prises en compte."],
    [DocumentTextIcon, "Historique privé", "Vos mesures et rapports restent dans votre espace sécurisé."],
    [UserGroupIcon, "Croissance de l'enfant", "Un dossier strictement séparé pour chaque enfant inscrit."],
  ] as const;
  const offerings = (plans?.length ? plans : [
    {id:"health-standard",name:english?"Autonomous Health Monitoring":"Suivi santé autonome",price:10000,currency:"XOF",service_type:"health_tracking",tier:"standard"},
    {id:"child-growth",name:english?"Child Growth Monitoring":"Suivi de la croissance de l'enfant",price:10000,currency:"XOF",service_type:"child_growth",tier:"standard"},
  ]) as any[];
  return <>{page&&<ManagedPageHero initial={page}/>}<MedicalDisclaimer/><section className="bg-forest py-9 text-white"><div className="container-site flex flex-wrap items-center justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-widest text-orange">{english?"Personalized access":"Accès personnalisé"}</p><p className="mt-2 text-2xl font-black text-white">{english?"Choose the monitoring that fits your needs":"Choisissez le suivi adapté à vos besoins"}</p></div><Link href={access?.health?"/api/access/open?service=health&role=client":"#offres"} className="rounded-full bg-white px-6 py-3 font-black text-forest shadow-soft">{access?.health?(english?"Open my monitoring":"Ouvrir mon suivi"):(english?"Access the service":"Accéder au service")}</Link></div></section><section className="section"><div className="container-site grid gap-6 md:grid-cols-2">{features.map(([Icon,title,description])=><article key={title} className="card p-7"><Icon className="h-10 text-leaf"/><h2 className="mt-5 text-2xl font-black">{title}</h2><p className="mt-3 text-slate-500">{description}</p></article>)}</div></section><section id="offres" className="section scroll-mt-24 bg-mint"><div className="container-site"><h2 className="text-center text-4xl font-black">{english?"Available health monitoring services":"Services de suivi santé disponibles"}</h2><div className="mx-auto mt-9 grid max-w-5xl gap-6 md:grid-cols-2">{offerings.map(plan=>{const child=plan.service_type==="child_growth",active=child?access?.childGrowth:access?.health;const checkout=`/checkout?type=subscription&id=${plan.id}`;const href=active?`/api/access/open?service=${child?"child_growth":"health"}&role=${child?"parent":"client"}`:user?checkout:`/connexion?redirect=${encodeURIComponent(checkout)}`;return <article key={plan.id} className="rounded-3xl bg-white p-8 shadow-soft"><p className="text-xs font-black uppercase tracking-widest text-leaf">{active?(english?"Active":"Actif"):(english?"Available":"Disponible")}</p><h3 className="mt-3 text-3xl font-black">{plan.name}</h3><p className="mt-5 text-2xl font-black text-orange">{Number(plan.price||0).toLocaleString("fr-FR")} {plan.currency||"XOF"}</p><p className="mt-3 leading-7 text-slate-600">{child?(english?"One private growth record per child, with curves and reports.":"Un dossier privé par enfant, avec courbes et rapports."):(english?"Measurements, trends, questionnaires and personalized reports.":"Mesures, tendances, questionnaires et rapports personnalisés.")}</p><Link href={href} className="btn-primary mt-7">{active?(english?"Open the service":"Ouvrir le service"):user?(english?"Activate monitoring":"Activer le suivi"):(english?"Sign in and continue":"Se connecter et continuer")}</Link></article>})}</div></div></section></>;
}
