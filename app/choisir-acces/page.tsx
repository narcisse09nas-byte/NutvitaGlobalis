import AccessSelector from "@/components/access/AccessSelector";
import { getAccessChoices } from "@/lib/platform-access";
import { redirect } from "next/navigation";

export const metadata = { title: "Choisir mon accès" };

export default async function AccessSelectionPage() {
  const access = await getAccessChoices();
  if (access.choices.length === 1) redirect("/api/access/auto");
  return <main className="min-h-screen bg-slate-100 px-5 py-12"><div className="mx-auto max-w-5xl"><p className="text-sm font-black uppercase tracking-[0.22em] text-orange">Session sécurisée</p><h1 className="mt-3 text-4xl font-black text-forest">Quel service et quel espace souhaitez-vous ouvrir ?</h1><p className="mt-3 max-w-3xl text-slate-600">Ce choix s’applique uniquement à votre session actuelle. Vous pourrez revenir ici depuis chaque espace.</p><div className="mt-9"><AccessSelector {...access}/></div></div></main>;
}
