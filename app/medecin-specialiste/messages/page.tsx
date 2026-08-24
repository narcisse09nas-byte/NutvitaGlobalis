import MedicalShell from "@/components/medical/MedicalShell";
import CollaborationChat from "@/components/collaboration/CollaborationChat";
import { requireSpecialist } from "@/lib/medical";

// CollaborationChat is fully generic (currentUserId + a contacts array with member_role) — reused
// verbatim, mirroring app/partenaire/messages/page.tsx, sourcing "clients" from this specialist's
// own patients instead of client_profiles.assigned_partner_id (medical has no such column).
export default async function Page() {
  const { supabase, user, profile } = await requireSpecialist();
  const [{ data: conversations }, { data: staff }, { data: consultations }] = await Promise.all([
    supabase.from("collaboration_conversations").select("*").order("updated_at", { ascending: false }),
    supabase.from("staff_profiles").select("id,full_name,department").eq("status", "active").order("full_name"),
    supabase.from("medical_consultations").select("client_id").eq("specialist_id", profile.id),
  ]);
  const clientIds = Array.from(new Set((consultations || []).map(item => item.client_id)));
  const { data: patients } = clientIds.length ? await supabase.from("client_profiles").select("id,full_name").in("id", clientIds).order("full_name") : { data: [] as any[] };
  const contacts = [...(staff || []).map((x: any) => ({ ...x, member_role: "staff" })), ...(patients || []).map((x: any) => ({ ...x, member_role: "client" }))];
  return <MedicalShell email={user.email || ""}><div className="mb-7"><h1 className="text-3xl font-black">Collaboration</h1><p className="mt-2 text-slate-500">Messages bilateraux ou groupes avec patients et collaborateurs.</p></div><CollaborationChat conversations={conversations || []} currentUserId={user.id} contacts={contacts} /></MedicalShell>;
}
