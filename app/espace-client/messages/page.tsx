import ClientShell from "@/components/client/ClientShell";
import CollaborationChat from "@/components/collaboration/CollaborationChat";
import { requireClient, getClientEntitlements } from "@/lib/client";
import { createAdminClient } from "@/lib/supabase/admin";

async function ensureSupportConversation(userId: string) {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("collaboration_conversations")
    .select("id")
    .eq("conversation_type", "support")
    .eq("created_by", userId)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data: conversation, error } = await admin
    .from("collaboration_conversations")
    .insert({ title: "Support administration NutVitaGlobalis", conversation_type: "support", created_by: userId })
    .select("id")
    .single();
  if (error || !conversation) return null;

  const { data: admins } = await admin
    .from("admin_users")
    .select("id")
    .eq("active", true)
    .limit(3);
  const members = Array.from(new Set([userId, ...(admins || []).map((item: any) => item.id)]));
  await admin.from("collaboration_members").insert(members.map(memberId => ({
    conversation_id: conversation.id,
    user_id: memberId,
    member_role: memberId === userId ? "client" : "admin",
  })));
  return conversation.id;
}

export default async function Page() {
  const { supabase, user } = await requireClient();
  const access = await getClientEntitlements(supabase, user.id);
  if (!access.health && !access.teleconsultation) return <ClientShell email={user.email || ""}><Locked /></ClientShell>;

  await ensureSupportConversation(user.id);
  const [{ data: members }, { data: all }] = await Promise.all([
    supabase.from("collaboration_members").select("conversation_id").eq("user_id", user.id),
    supabase.from("collaboration_conversations").select("*").order("updated_at", { ascending: false }),
  ]);
  const ids = new Set((members || []).map((x: any) => x.conversation_id));
  const conversations = (all || []).filter((x: any) => ids.has(x.id) && (access.teleconsultation ? ["support", "consultation"].includes(x.conversation_type) : x.conversation_type === "support"));

  return <ClientShell email={user.email || ""}><div className="mb-7"><h1 className="text-3xl font-black">Mes messages</h1><p className="mt-2 text-slate-500">{access.teleconsultation ? "Echangez avec le support et l'expert affecte a votre pack." : "Votre suivi autonome permet d'ecrire a l'administration NutVitaGlobalis."}</p></div><CollaborationChat conversations={conversations} currentUserId={user.id} /></ClientShell>;
}

function Locked() {
  return <div className="rounded-2xl border bg-white p-8"><h1 className="text-2xl font-black">Messagerie indisponible</h1><p className="mt-3 text-slate-500">Achetez ou activez un service NutVitaGlobalis pour ecrire a l'administration.</p></div>;
}
