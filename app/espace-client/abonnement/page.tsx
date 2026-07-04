import ClientShell from "@/components/client/ClientShell";
import SubscriptionPlans from "@/components/client/SubscriptionPlans";
import { requireClient } from "@/lib/client";
import { getApplicableTax } from "@/lib/taxes";

export default async function SubscriptionPage() {
  const { supabase, user, profile } = await requireClient();
  const [{ data: plans }, { data: subscriptions }, { data: packs }, { data: children }, { data: invoices }, tax] = await Promise.all([
    supabase.from("subscription_plans").select("*").eq("active", true).in("service_type", ["health_tracking", "child_growth"]).order("service_type").order("tier"),
    supabase.from("subscriptions").select("*, subscription_plans(name,tier,service_type), children(full_name)").eq("client_id", user.id).in("status", ["active", "pending"]).order("created_at", { ascending: false }),
    supabase.from("consultation_bookings").select("*, teleconseils(name,duration)").eq("client_id", user.id).not("status", "in", '("cancelled","refunded")').order("created_at", { ascending: false }),
    supabase.from("children").select("id,full_name").eq("parent_id", user.id).eq("active", true).order("full_name"),
    supabase.from("invoices").select("*").eq("client_id", user.id).order("issued_at", { ascending: false }),
    getApplicableTax(supabase, profile?.country_code),
  ]);
  return <ClientShell email={user.email || ""}><div className="mb-7"><h1 className="text-3xl font-black">Mes abonnements</h1><p className="mt-2 text-slate-500">Chaque service, pack et enfant conserve son propre acces, son historique et sa date d expiration.</p></div><SubscriptionPlans plans={plans || []} subscriptions={subscriptions || []} packs={packs || []} children={children || []} taxRate={Number(tax.rate)} invoices={invoices || []} /></ClientShell>;
}
