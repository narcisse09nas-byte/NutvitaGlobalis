import ClientShellClient from "@/components/client/ClientShellClient";
import {getClientEntitlements,requireClient} from "@/lib/client";
export default async function ClientShell({children,email}:{children:React.ReactNode;email:string}){const {supabase,user}=await requireClient();const access=await getClientEntitlements(supabase,user.id);return <ClientShellClient email={email} access={access}>{children}</ClientShellClient>}
