import ClientShell from "@/components/client/ClientShell";
import ClientLanding from "@/components/client/ClientLanding";
import { getClientEntitlements, requireClient } from "@/lib/client";
import { getAccessChoices } from "@/lib/platform-access";

export const metadata = { title: "Mon espace NutVitaGlobalis" };

export default async function ClientHome() {
  const { supabase, user, profile } = await requireClient();
  const [access, enrollment, platformAccess] = await Promise.all([
    getClientEntitlements(supabase, user.id),
    supabase.from("formation_enrollments").select("id", { count: "exact", head: true }).eq("client_id", user.id),
    getAccessChoices(),
  ]);
  return <ClientShell email={user.email || ""} service="client"><ClientLanding name={profile?.full_name || user.user_metadata.full_name || ""} access={access} academyActive={Boolean(enrollment.count)} activeServices={[...new Set(platformAccess.choices.map(choice => choice.service))]}/></ClientShell>;
}
