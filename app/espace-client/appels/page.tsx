import ClientShell from "@/components/client/ClientShell";
import CallManager from "@/components/collaboration/CallManager";
import {requireTeleconsultationAccess} from "@/lib/client";
export default async function Page(){
 const {supabase,user}=await requireTeleconsultationAccess();
 const [{data:memberRows},{data:conversations}]=await Promise.all([
  supabase.from("collaboration_call_members").select("call_id, collaboration_calls(*, collaboration_call_members(*))").eq("user_id",user.id),
  supabase.from("collaboration_conversations").select("*").order("updated_at",{ascending:false})
 ]);
 const calls=(memberRows||[]).map((x:any)=>x.collaboration_calls).filter(Boolean);
 return <ClientShell email={user.email||""}><div className="mb-7"><h1 className="text-3xl font-black">Réunions et téléconsultations</h1><p className="mt-2 text-slate-500">Toutes les réunions auxquelles vous êtes personnellement invité.</p></div><CallManager initial={calls} conversations={conversations||[]} currentUserId={user.id} canCreate={false}/></ClientShell>
}
