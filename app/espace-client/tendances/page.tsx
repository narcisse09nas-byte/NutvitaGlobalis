import ClientShell from "@/components/client/ClientShell";
import HealthTrendsDashboard from "@/components/client/HealthTrendsDashboard";
import { requireHealthAccess } from "@/lib/client";
export default async function TrendsPage(){
  const {supabase,user}=await requireHealthAccess();
  const [{data:anthropometry},{data:biology},{data:food},{data:wellness}]=await Promise.all([
    supabase.from("anthropometric_measurements").select("*").eq("client_id",user.id).order("measured_at"),
    supabase.from("biological_measurements").select("*").eq("client_id",user.id).order("measured_at"),
    supabase.from("food_history").select("*").eq("client_id",user.id).order("entry_date"),
    supabase.from("health_lifestyle_assessments").select("assessed_at,nutrition_score,physical_activity_score,lifestyle_score").eq("client_id",user.id).order("assessed_at")
  ]);
  return <ClientShell email={user.email||""}><div className="mb-7"><h1 className="text-3xl font-black">Tableaux de bord et tendances</h1><p className="mt-2 text-slate-500">Toutes vos variables renseign&eacute;es sont visibles; utilisez les filtres pour personnaliser l&rsquo;affichage.</p></div><HealthTrendsDashboard anthropometry={anthropometry||[]} biology={biology||[]} food={food||[]} wellness={wellness||[]}/></ClientShell>
}