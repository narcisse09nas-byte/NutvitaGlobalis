import {redirect} from "next/navigation";
import MedicalWorkspace from "@/components/medical/MedicalWorkspace";
import {createClient} from "@/lib/supabase/server";
import {getCurrentLocale} from "@/lib/i18n-server";
export default async function Page(){const locale=await getCurrentLocale(),supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)redirect(`/${locale}/connexion?next=/medecin-specialiste`);const{data:s}=await supabase.from("medical_specialists").select("*").eq("user_id",user.id).eq("active",true).maybeSingle();if(!s)redirect(`/${locale}/medecin-candidat`);const{data:c}=await supabase.from("medical_consultations").select("*").eq("specialist_id",s.id).order("scheduled_at",{ascending:false});return <MedicalWorkspace role="specialist" name={s.full_name} consultations={c||[]} locale={locale}/>}
