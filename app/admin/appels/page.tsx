import AdminShell from "@/components/admin/AdminShell";
import CallManager from "@/components/collaboration/CallManager";
import { requireAdmin } from "@/lib/admin";

export default async function Page() {
  const { supabase, user, admin } = await requireAdmin();
  const [{ data: calls }, { data: conversations }, { data: clients }, { data: staff }, { data: partners }] = await Promise.all([
    supabase.from("collaboration_calls").select("*, collaboration_call_members(*)").order("scheduled_at", { ascending: false }),
    supabase.from("collaboration_conversations").select("*").order("updated_at", { ascending: false }),
    supabase.from("client_profiles").select("id,full_name,username,email,client_number,partner_assignment_status").order("full_name").limit(250),
    supabase.from("staff_profiles").select("id,full_name,department,status").order("full_name"),
    supabase.from("dietitian_profiles").select("candidate_id,full_name,status").order("full_name"),
  ]);
  const collaborators = [...(staff || []).map((x: any) => ({ ...x, member_role: "staff" })), ...(partners || []).map((x: any) => ({ id: x.candidate_id, full_name: x.full_name, member_role: `partner-${x.status}` }))];
  return <AdminShell name={admin.full_name || admin.email}><div className="mb-7"><h1 className="text-3xl font-black">Appels et reunions</h1><p className="mt-2 text-slate-500">Les admins peuvent appeler tout client, actif ou inactif, et tout collaborateur.</p></div><CallManager initial={calls || []} conversations={conversations || []} currentUserId={user.id} clients={clients || []} collaborators={collaborators} adminMode /></AdminShell>;
}
