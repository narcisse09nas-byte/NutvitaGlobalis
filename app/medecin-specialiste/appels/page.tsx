import MedicalShell from "@/components/medical/MedicalShell";
import CallManager from "@/components/collaboration/CallManager";
import { requireSpecialist } from "@/lib/medical";

// CallManager is fully generic — reused verbatim, mirroring app/partenaire/appels/page.tsx.
export default async function Page() {
  const { supabase, user, profile } = await requireSpecialist();
  const [{ data: calls }, { data: conversations }, { data: staff }, { data: consultations }] = await Promise.all([
    supabase.from("collaboration_calls").select("*, collaboration_call_members(*)").order("scheduled_at", { ascending: false }),
    supabase.from("collaboration_conversations").select("*").order("updated_at", { ascending: false }),
    supabase.from("staff_profiles").select("id,full_name,department").eq("status", "active").order("full_name"),
    supabase.from("medical_consultations").select("client_id").eq("specialist_id", profile.id),
  ]);
  const clientIds = Array.from(new Set((consultations || []).map(item => item.client_id)));
  const { data: patients } = clientIds.length ? await supabase.from("client_profiles").select("id,full_name,username,email,client_number").in("id", clientIds).order("full_name") : { data: [] as any[] };
  return <MedicalShell email={user.email || ""}><div className="mb-7"><h1 className="text-3xl font-black">Appels video</h1><p className="mt-2 text-slate-500">Choisissez patient ou collaborateurs, puis ajoutez des participants pendant la reunion.</p></div><CallManager initial={calls || []} conversations={conversations || []} currentUserId={user.id} clients={patients || []} collaborators={staff || []} /></MedicalShell>;
}
