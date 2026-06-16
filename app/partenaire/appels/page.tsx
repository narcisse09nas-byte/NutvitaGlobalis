import PartnerShell from "@/components/partner/PartnerShell";
import CallManager from "@/components/collaboration/CallManager";
import { requirePartner } from "@/lib/partner";

export default async function Page() {
  const { supabase, user, profile } = await requirePartner();
  const now = new Date().toISOString();
  const [{ data: calls }, { data: conversations }, { data: clients }, { data: staff }] = await Promise.all([
    supabase.from("collaboration_calls").select("*, collaboration_call_members(*)").order("scheduled_at", { ascending: false }),
    supabase.from("collaboration_conversations").select("*").order("updated_at", { ascending: false }),
    supabase.from("client_profiles").select("id,full_name,username,email,client_number,partner_assignment_status,partner_access_expires_at").or(`created_by_partner_id.eq.${profile.id},assigned_partner_id.eq.${profile.id}`).gte("partner_access_expires_at", now).order("full_name"),
    supabase.from("staff_profiles").select("id,full_name,department").eq("status", "active").order("full_name"),
  ]);
  return <PartnerShell email={user.email || ""}><div className="mb-7"><h1 className="text-3xl font-black">Appels video</h1><p className="mt-2 text-slate-500">Choisissez client actif ou collaborateurs, puis ajoutez des participants pendant la reunion.</p></div><CallManager initial={calls || []} conversations={conversations || []} currentUserId={user.id} clients={clients || []} collaborators={staff || []} /></PartnerShell>;
}
