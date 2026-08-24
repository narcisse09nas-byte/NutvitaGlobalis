import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PPMShell from "@/components/op-management/PPMShell";
import OrganizationManager from "@/components/op-management/OrganizationManager";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import { listOrganizations } from "@/lib/ppm/queries";

export const metadata = { title: "Organisations | PPM NutVitaGlobalis" };

export default async function OrganizationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent("/op-management/organisations")}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const locale = await getCurrentLocale();
  const organizations = await listOrganizations(supabase);

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/organisations", label: bc(locale, "organizations") }]}>
    <OrganizationManager initial={organizations} />
  </PPMShell>;
}
