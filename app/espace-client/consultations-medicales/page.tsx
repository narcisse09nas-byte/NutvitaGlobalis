import {redirect} from "next/navigation";
import MedicalWorkspace from "@/components/medical/MedicalWorkspace";
import {createClient} from "@/lib/supabase/server";
import {getCurrentLocale} from "@/lib/i18n-server";
export default async function Page(){const locale=await getCurrentLocale(),supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)redirect(`/${locale}/connexion?next=/espace-client/consultations-medicales`);const{data:c}=await supabase.from("medical_consultations").select("*,medical_specialists(full_name,photo_url,specialty)").eq("client_id",user.id).order("scheduled_at",{ascending:false});return <MedicalWorkspace role="client" name={user.user_metadata?.full_name||user.email||""} consultations={c||[]} locale={locale}/>}
