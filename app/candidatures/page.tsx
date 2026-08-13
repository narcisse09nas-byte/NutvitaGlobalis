import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";

export default async function ApplicationsGateway() {
  const locale = await getCurrentLocale();
  const en = locale === "en";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/connexion?next=/candidatures`);
  const [{ data: professional }, { data: medical }] = await Promise.all([
    supabase.from("recruitment_applications").select("recruitment_type,status").eq("candidate_id", user.id),
    supabase.from("medical_specialist_applications").select("status").eq("candidate_id", user.id),
  ]);
  const choices: Array<{ title: string; text: string; href: string }> = [];
  for (const item of professional || []) {
    const promoter = item.recruitment_type === "promoter";
    choices.push({
      title: promoter ? (en ? "Promoter application" : "Candidature promoteur") : (en ? "Professional application" : "Candidature professionnelle"),
      text: en ? `Status: ${item.status}` : `Statut : ${item.status}`,
      href: promoter ? "/candidat?type=promoter" : "/candidat",
    });
  }
  if (medical?.length) choices.push({ title: en ? "Specialist doctor application" : "Candidature médecin spécialiste", text: en ? `Status: ${medical[0].status}` : `Statut : ${medical[0].status}`, href: "/medecin-candidat" });
  if (choices.length === 1) redirect(choices[0].href);
  return <main className="min-h-screen bg-slate-100 py-12"><div className="container-site"><Link href="/" className="font-bold text-leaf">← {en ? "Main website" : "Page principale"}</Link><h1 className="mt-6 text-4xl font-black">{en ? "My applications" : "Mes candidatures"}</h1><p className="mt-3 text-slate-600">{choices.length ? (en ? "Choose the recruitment process you want to open." : "Choisissez le processus de recrutement que vous souhaitez ouvrir.") : (en ? "No application has been submitted yet." : "Aucune candidature n’a encore été soumise.")}</p><div className="mt-8 grid gap-5 md:grid-cols-2">{choices.map(choice=><Link key={choice.href} href={choice.href} className="rounded-3xl border bg-white p-7 shadow-soft transition hover:-translate-y-1 hover:border-leaf"><h2 className="text-2xl font-black text-forest">{choice.title}</h2><p className="mt-3 text-slate-500">{choice.text}</p><span className="mt-6 inline-flex font-black text-leaf">{en ? "Open this application" : "Ouvrir cette candidature"} →</span></Link>)}</div></div></main>;
}
