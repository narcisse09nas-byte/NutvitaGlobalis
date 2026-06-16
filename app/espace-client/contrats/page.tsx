import ClientShell from "@/components/client/ClientShell";
import ContractCenter from "@/components/contracts/ContractCenter";
import { requireClient } from "@/lib/client";

export default async function ClientContractsPage() {
  const { supabase, user } = await requireClient();
  const { data } = await supabase.from("contracts").select("*, contract_signatures(*)").eq("party_user_id", user.id).order("created_at", { ascending: false });
  return <ClientShell email={user.email || ""}><div className="mb-7"><h1 className="text-3xl font-black">Contrats et consentements</h1><p className="mt-2 text-slate-500">Consultez, signez et telechargez vos documents securises.</p></div><ContractCenter initial={data || []} currentUserId={user.id} /></ClientShell>;
}
