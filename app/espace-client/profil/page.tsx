import ClientProfileForm from "@/components/client/ClientProfileForm";
import ClientShell from "@/components/client/ClientShell";
import { requireClient } from "@/lib/client";
import { getCurrentLocale } from "@/lib/i18n-server";

export default async function ClientProfilePage() {
  const { user, profile } = await requireClient();
  const locale=await getCurrentLocale(),en=locale==="en";
  return <ClientShell email={user.email || ""}><div className="mb-7"><h1 className="text-3xl font-black">{en?"My health profile":"Mon profil sante"}</h1><p className="mt-2 text-slate-500">{en?"Personal information, medical history and allergies.":"Informations personnelles, antecedents et allergies."}</p></div><ClientProfileForm userId={user.id} email={user.email || ""} initial={profile || {}} locale={locale}/></ClientShell>;
}
