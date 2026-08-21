import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PPMShell from "@/components/op-management/PPMShell";
import OrganizationManager from "@/components/op-management/OrganizationManager";
import { listOrganizations } from "@/lib/ppm/queries";

export const metadata = { title: "Organisations | PPM NutVitaGlobalis" };

export default async function OrganizationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent("/op-management/organisations")}`);
  const name = user.user_metadata?.full_name || user.email || "Utilisateur";
  const organizations = await listOrganizations(supabase);

  return <PPMShell name={name} breadcrumbs={[{ href: "/op-management", label: "Vue d'ensemble" }, { href: "/op-management/organisations", label: "Organisations" }]}>
    <OrganizationManager initial={organizations} />
  </PPMShell>;
}
