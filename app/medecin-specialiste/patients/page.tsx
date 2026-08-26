import MedicalShell from "@/components/medical/MedicalShell";
import MedicalPatientManager from "@/components/medical/MedicalPatientManager";
import { requireSpecialist } from "@/lib/medical";

export default async function Page() {
  const { supabase, user, profile } = await requireSpecialist();
  const { data: consultations } = await supabase.from("medical_consultations").select("client_id").eq("specialist_id", profile.id);
  const clientIds = Array.from(new Set((consultations || []).map(item => item.client_id)));
  const { data: patients } = clientIds.length
    ? await supabase.from("client_profiles").select("*").in("id", clientIds).order("full_name")
    : { data: [] as any[] };
  return <MedicalShell email={user.email || ""}>
    <MedicalPatientManager initial={patients || []} freeOnsiteCreation={!!profile.free_onsite_creation} />
  </MedicalShell>;
}
