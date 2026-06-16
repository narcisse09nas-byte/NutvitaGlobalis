import SupportCenter from "@/components/support/SupportCenter";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Support" };

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: tickets } = user ? await supabase.from("support_tickets").select("*").eq("requester_id", user.id).order("created_at", { ascending: false }) : { data: [] };
  return <main><section className="section bg-mint"><div className="container-site max-w-4xl text-center"><p className="eyebrow">Support client</p><h1 className="text-4xl font-black md:text-6xl">Centre d'aide NutVitaGlobalis</h1><p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">FAQ, guides d'utilisation, tickets support et messagerie avec l'equipe.</p></div></section><section className="section"><div className="container-site"><SupportCenter initialTickets={tickets || []} userId={user?.id} /></div></section></main>;
}
