import ClientShell from "@/components/client/ClientShell";
import MedicalWorkspace from "@/components/medical/MedicalWorkspace";
import {requireMedicalConsultationAccess} from "@/lib/client";
import {getCurrentLocale} from "@/lib/i18n-server";
export default async function Page(){const locale=await getCurrentLocale(),{supabase,user}=await requireMedicalConsultationAccess();const{data:c}=await supabase.from("medical_consultations").select("*,medical_specialists(full_name,photo_url,specialty)").eq("client_id",user.id).order("scheduled_at",{ascending:false});return <ClientShell email={user.email||""} service="medical_consultation"><MedicalWorkspace role="client" name={user.user_metadata?.full_name||user.email||""} consultations={c||[]} locale={locale}/></ClientShell>}
