import MedicalShell from "@/components/medical/MedicalShell";
import MedicalConsultationWorkspace from "@/components/medical/MedicalConsultationWorkspace";
import { attachClientProfiles, requireSpecialist } from "@/lib/medical";

export default async function Page() {
  const { supabase, user, profile } = await requireSpecialist();
  const { data: consultationsRaw } = await supabase.from("medical_consultations").select("*").eq("specialist_id", profile.id).order("scheduled_at", { ascending: false });
  const consultations = await attachClientProfiles(supabase, consultationsRaw || []);
  const clientIds = Array.from(new Set(consultations.map(item => item.client_id)));
  const { data: patients } = clientIds.length ? await supabase.from("client_profiles").select("*").in("id", clientIds).order("full_name") : { data: [] as any[] };
  return <MedicalShell email={user.email || ""}>
    <header className="mb-7"><span className="text-xs font-black uppercase tracking-[.2em] text-orange">NutVitaGlobalis Consultations</span><h1 className="mt-2 text-3xl font-black text-forest">Espace consultations medicales specialisees</h1></header>
    <MedicalConsultationWorkspace initial={consultations} patients={patients || []} specialistId={profile.id} />
  </MedicalShell>;
}
