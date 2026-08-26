import MedicalShell from "@/components/medical/MedicalShell";
import MedicalWaitingRoom from "@/components/medical/MedicalWaitingRoom";
import { attachClientProfiles, requireSpecialist } from "@/lib/medical";

export default async function Page() {
  const { supabase, user, profile } = await requireSpecialist();
  const [{ data }, { data: unassignedData }] = await Promise.all([
    supabase.from("medical_consultations").select("*").eq("specialist_id", profile.id).eq("status", "requested").order("created_at", { ascending: false }),
    supabase.from("medical_consultations").select("*").is("specialist_id", null).eq("status", "pending_assignment").order("created_at", { ascending: false }),
  ]);
  const [rows, unassigned] = await Promise.all([attachClientProfiles(supabase, data || []), attachClientProfiles(supabase, unassignedData || [])]);
  return <MedicalShell email={user.email || ""}>
    <header className="mb-7"><h1 className="text-3xl font-black">Salle d&apos;attente</h1><p className="mt-2 text-slate-500">Demandes de consultation en attente de votre confirmation, et clients non assignes achetes via la facturation Maximus.</p></header>
    <MedicalWaitingRoom initial={rows} unassigned={unassigned} specialistId={profile.id} />
  </MedicalShell>;
}
