import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PPMShell from "@/components/op-management/PPMShell";
import OperationManager from "@/components/op-management/OperationManager";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import { listOperations, listOrganizations, listProjects } from "@/lib/ppm/queries";

export const metadata = { title: "Operations | PPM NutVitaGlobalis" };

export default async function OperationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent("/op-management/operations")}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const locale = await getCurrentLocale();
  const [operations, organizations, projects] = await Promise.all([listOperations(supabase), listOrganizations(supabase), listProjects(supabase)]);

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/operations", label: bc(locale, "operations") }]}>
    <OperationManager initial={operations} organizations={organizations} projects={projects} />
  </PPMShell>;
}
