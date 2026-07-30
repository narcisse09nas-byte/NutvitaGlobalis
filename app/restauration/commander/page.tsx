import { requireActivePlatformSession } from "@/lib/active-platform-session";
import ClientShell from "@/components/client/ClientShell";
import CateringOrderCenter from "@/components/client/CateringOrderCenter";
import { requireClient } from "@/lib/client";
import { getCurrentLocale } from "@/lib/i18n-server";

export default async function CateringOrderPage() {
  await requireActivePlatformSession("catering","client");
  const [{ supabase, user, profile }, locale] = await Promise.all([requireClient(), getCurrentLocale()]);
  const today = new Date().toISOString().slice(0,10);
  const [{ data: menus }, { data: orders }] = await Promise.all([
    supabase.from("catering_menus").select("*").eq("published",true).gte("available_date",today).order("city").order("available_date"),
    supabase.from("catering_orders").select("*,catering_order_items(*)").eq("client_id",user.id).order("created_at",{ascending:false}),
  ]);
  return <ClientShell email={user.email||""} service="catering"><CateringOrderCenter locale={locale} menus={menus||[]} orders={orders||[]} profile={{name:profile?.full_name||"",phone:profile?.phone||"",city:profile?.city||""}}/></ClientShell>;
}
