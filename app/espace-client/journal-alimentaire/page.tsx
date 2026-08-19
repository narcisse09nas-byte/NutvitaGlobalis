import ClientShell from "@/components/client/ClientShell";
import CareWorkspace from "@/components/client/CareWorkspace";
import {requireHealthAccess} from "@/lib/client";
import {getCurrentLocale} from "@/lib/i18n-server";
export default async function Page(){const{supabase,user}=await requireHealthAccess();const en=(await getCurrentLocale())==="en";const{data}=await supabase.from("food_history").select("*").eq("client_id",user.id).order("entry_date",{ascending:false});return <ClientShell email={user.email||""}><CareWorkspace mode="food" userId={user.id} initial={data||[]} english={en}/></ClientShell>}
