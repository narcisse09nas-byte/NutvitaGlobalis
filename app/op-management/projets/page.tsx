import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectManager from "@/components/op-management/ProjectManager";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import { listAllOrganizationStaff, listPortfolios, listPrograms, listProjects } from "@/lib/ppm/queries";

export const metadata = { title: "Projets | PPM NutVitaGlobalis" };

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent("/op-management/projets")}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const locale = await getCurrentLocale();
  const [portfolios, programs, projects, orgStaff] = await Promise.all([listPortfolios(supabase), listPrograms(supabase), listProjects(supabase), listAllOrganizationStaff(supabase)]);

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/projets", label: bc(locale, "projects") }]}>
    <ProjectManager initial={projects} portfolios={portfolios} programs={programs} orgStaff={orgStaff} />
  </PPMShell>;
}
