import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import CadrageTabs from "@/components/op-management/CadrageTabs";
import ProjectIdentificationForm from "@/components/op-management/ProjectIdentificationForm";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import { getProject, listPortfolios, listPrograms, listResources, listStakeholders } from "@/lib/ppm/queries";

export default async function CadrageIdentificationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/cadrage/identification`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const locale = await getCurrentLocale();
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const [portfolios, programs, resources, stakeholders] = await Promise.all([listPortfolios(supabase), listPrograms(supabase), listResources(supabase, id), listStakeholders(supabase, id)]);
  const staff = resources.filter(item => item.type === "human" || item.type === "consultant");

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/projets", label: bc(locale, "projects") }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/cadrage/identification`, label: bc(locale, "scoping") }]}>
    <ProjectShell project={project}>
      <div className="grid gap-5">
        <CadrageTabs projectId={id} />
        <ProjectIdentificationForm project={project} portfolios={portfolios} programs={programs} staff={staff} stakeholders={stakeholders} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
