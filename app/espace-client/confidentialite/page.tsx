import ClientShell from "@/components/client/ClientShell";
import PrivacyCenter from "@/components/client/PrivacyCenter";
import { requireClient } from "@/lib/client";

export default async function Page() {
  const { supabase, user } = await requireClient();
  const [{ data: consents }, { data: requests }] = await Promise.all([
    supabase.from("user_consents").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("privacy_requests").select("*").eq("user_id", user.id).order("requested_at", { ascending: false }),
  ]);
  return <ClientShell email={user.email || ""}><div className="mb-7"><h1 className="text-3xl font-black">Confidentialite et donnees</h1><p className="mt-2 text-slate-500">Telechargez vos donnees, gerez vos consentements et vos demandes de suppression.</p></div><PrivacyCenter userId={user.id} consents={consents || []} requests={requests || []} /></ClientShell>;
}
