import AdminShell from "@/components/admin/AdminShell";
import CollaborationChat from "@/components/collaboration/CollaborationChat";
import { requireAdmin } from "@/lib/admin";

export default async function Page() {
  const { supabase, user, admin } = await requireAdmin();
  const [{ data }, { data: staff }, { data: partners }, { data: clients }] = await Promise.all([
    supabase.from("collaboration_conversations").select("*").order("updated_at", { ascending: false }),
    supabase.from("staff_profiles").select("id,full_name,department,status"),
    supabase.from("dietitian_profiles").select("candidate_id,full_name,status"),
    supabase.from("client_profiles").select("id,full_name,partner_assignment_status").limit(250),
  ]);
  const contacts = [...(staff || []).map((x: any) => ({ ...x, member_role: `staff-${x.status}` })), ...(partners || []).map((x: any) => ({ id: x.candidate_id, full_name: x.full_name, member_role: `partner-${x.status}` })), ...(clients || []).map((x: any) => ({ ...x, member_role: "client" }))];
  return <AdminShell name={admin.full_name || admin.email}><div className="mb-7"><h1 className="text-3xl font-black">Collaboration interne</h1><p className="mt-2 text-slate-500">Messages bilateraux ou groupes avec clients, partenaires et collaborateurs.</p></div><CollaborationChat conversations={data || []} currentUserId={user.id} contacts={contacts} /></AdminShell>;
}
