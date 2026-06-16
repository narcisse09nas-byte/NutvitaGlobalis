import ClientProfileForm from "@/components/client/ClientProfileForm";
import ClientShell from "@/components/client/ClientShell";
import { requireClient } from "@/lib/client";

export default async function ClientProfilePage() {
  const { user, profile } = await requireClient();
  return <ClientShell email={user.email || ""}><div className="mb-7"><h1 className="text-3xl font-black">Mon profil sante</h1><p className="mt-2 text-slate-500">Informations personnelles, antecedents et allergies.</p></div><ClientProfileForm userId={user.id} email={user.email || ""} initial={profile || {}} /></ClientShell>;
}
