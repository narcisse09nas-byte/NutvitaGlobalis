import ClientShell from "@/components/client/ClientShell";
import ServiceCatalog from "@/components/client/ServiceCatalog";
import { requireClient } from "@/lib/client";
import { getApplicableTax } from "@/lib/taxes";

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ categorie?: string }> }) {
  const params = await searchParams;
  const { supabase, user, profile } = await requireClient();
  const [{ data: plans }, { data: packs }, { data: courses }, { data: children }, { data: subscriptions }, tax] = await Promise.all([
    supabase.from("subscription_plans").select("*").eq("active", true).order("service_type").order("tier"),
    supabase.from("teleconseils").select("*").eq("status", "active").order("price"),
    supabase.from("formations").select("*").eq("status", "published").order("created_at", { ascending: false }),
    supabase.from("children").select("id,first_name,last_name").eq("parent_id", user.id).order("created_at", { ascending: false }),
    supabase.from("subscriptions").select("id,plan_id,status,expires_at,child_id").eq("client_id", user.id).in("status", ["active", "pending"]).order("created_at", { ascending: false }),
    getApplicableTax(supabase, profile?.country_code),
  ]);
  return <ClientShell email={user.email || ""}><div className="mb-7"><h1 className="text-3xl font-black">Services disponibles</h1><p className="mt-2 text-slate-500">Choisissez un service depuis votre espace client, puis selectionnez Mobile Money manuel, virement bancaire ou une solution automatique disponible.</p></div><ServiceCatalog plans={plans || []} packs={packs || []} courses={courses || []} children={children || []} subscriptions={subscriptions || []} taxRate={Number(tax.rate)} initialFilter={params.categorie || "all"} /></ClientShell>;
}
