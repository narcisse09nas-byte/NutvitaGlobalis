import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectManager from "@/components/op-management/ProjectManager";
import { listPortfolios, listPrograms, listProjects } from "@/lib/ppm/queries";

export const metadata = { title: "Projets | PPM NutVitaGlobalis" };

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent("/op-management/projets")}`);
  const name = user.user_metadata?.full_name || user.email || "Utilisateur";
  const [portfolios, programs, projects] = await Promise.all([listPortfolios(supabase), listPrograms(supabase), listProjects(supabase)]);

  return <PPMShell name={name} breadcrumbs={[{ href: "/op-management", label: "Vue d'ensemble" }, { href: "/op-management/projets", label: "Projets" }]}>
    <ProjectManager initial={projects} portfolios={portfolios} programs={programs} />
  </PPMShell>;
}
