import PartnerShell from "@/components/partner/PartnerShell";
import CollaborationChat from "@/components/collaboration/CollaborationChat";
import { requirePartner } from "@/lib/partner";

export default async function Page() {
  const { supabase, user, profile } = await requirePartner();
  const now = new Date().toISOString();
  const [{ data }, { data: staff }, { data: clients }] = await Promise.all([
    supabase.from("collaboration_conversations").select("*").order("updated_at", { ascending: false }),
    supabase.from("staff_profiles").select("id,full_name,department").eq("status", "active").order("full_name"),
    supabase.from("client_profiles").select("id,full_name,partner_access_expires_at").or(`created_by_partner_id.eq.${profile.id},assigned_partner_id.eq.${profile.id}`).gte("partner_access_expires_at", now).order("full_name"),
  ]);
  const contacts = [...(staff || []).map((x: any) => ({ ...x, member_role: "staff" })), ...(clients || []).map((x: any) => ({ ...x, member_role: "client" }))];
  return <PartnerShell email={user.email || ""}><div className="mb-7"><h1 className="text-3xl font-black">Collaboration</h1><p className="mt-2 text-slate-500">Messages bilateraux ou groupes avec clients actifs et collaborateurs.</p></div><CollaborationChat conversations={data || []} currentUserId={user.id} contacts={contacts} /></PartnerShell>;
}
