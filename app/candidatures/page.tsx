import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCandidatureCards, getLatestNotifications } from "@/lib/candidate-unified";
import CandidaturesRegistry from "@/components/candidate/CandidaturesRegistry";

export const metadata = { title: "Mes candidatures" };

export default async function ApplicationsGateway() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent("/candidatures")}`);

  const cards = await getCandidatureCards(supabase, user.id);
  const notifications = await getLatestNotifications(supabase, user.id, cards);

  return <main className="min-h-screen bg-slate-100 py-12">
    <div className="container-site">
      <Link href="/" className="font-bold text-leaf">← Page principale</Link>
      <h1 className="mt-6 text-4xl font-black">Mes candidatures</h1>
      <p className="mt-3 text-slate-600">Retrouvez ici toutes vos candidatures soumises à NutVitaGlobalis, leur statut et vos dernières notifications.</p>
      <div className="mt-8"><CandidaturesRegistry cards={cards} notifications={notifications} /></div>
    </div>
  </main>;
}
