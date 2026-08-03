import ClientShell from "@/components/client/ClientShell";
import ClientServiceLanding from "@/components/client/ClientServiceLanding";
import {requireClient} from "@/lib/client";
import {getAccessChoices} from "@/lib/platform-access";
export const metadata={title:"Mon espace NutVitaGlobalis"};
export default async function ClientHome(){
 const {user,profile}=await requireClient(),access=await getAccessChoices();
 return <ClientShell email={user.email||""} service="client"><ClientServiceLanding name={profile?.full_name||user.user_metadata.full_name||""} email={profile?.email||profile?.login_email||user.email||""} choices={access.choices.map(({service,role,roleLabel,href})=>({service,role,roleLabel,href}))}/></ClientShell>
}
