import AdminShell from "@/components/admin/AdminShell";
import ExternalMessagesManager from "@/components/admin/ExternalMessagesManager";
import { requireAdmin } from "@/lib/admin";

export default async function ExternalMessagesPage(){const{supabase,admin}=await requireAdmin();const{data}=await supabase.from("external_messages").select("*").order("created_at",{ascending:false});return <AdminShell name={admin.full_name||admin.email}><div className="mb-7"><h1 className="text-3xl font-black">Messages externes</h1><p className="mt-2 text-slate-500">Messages deposes depuis le site public et coordonnees facultatives permettant d y repondre.</p></div><ExternalMessagesManager initial={data||[]}/></AdminShell>}
