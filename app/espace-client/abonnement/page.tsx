import ClientShell from "@/components/client/ClientShell";
import SubscriptionPlans from "@/components/client/SubscriptionPlans";
import { requireClient } from "@/lib/client";
import { getApplicableTax } from "@/lib/taxes";

export default async function SubscriptionPage() {
  const { supabase, user, profile } = await requireClient();
  const [{ data: plans }, { data: current }, { data: invoices }, tax] = await Promise.all([
    supabase.from("subscription_plans").select("*").eq("active", true).eq("service_type", "health_tracking").order("tier").order("duration_months"),
    supabase.from("subscriptions").select("*, subscription_plans(name,tier)").eq("client_id", user.id).is("child_id", null).in("status", ["active", "pending"]).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("invoices").select("*").eq("client_id", user.id).order("issued_at", { ascending: false }),
    getApplicableTax(supabase, profile?.country_code),
  ]);
  return <ClientShell email={user.email || ""}><div className="mb-7"><h1 className="text-3xl font-black">Suivi Sante Autonome</h1><p className="mt-2 text-slate-500">10 000 FCFA HT pour 12 mois. La taxe est calculee automatiquement selon votre pays.</p></div><SubscriptionPlans plans={plans || []} current={current} taxRate={Number(tax.rate)} invoices={invoices || []} /></ClientShell>;
}
