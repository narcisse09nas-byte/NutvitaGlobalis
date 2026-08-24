import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import CadrageTabs from "@/components/op-management/CadrageTabs";
import GovernanceManager from "@/components/op-management/GovernanceManager";
import RaciMatrix from "@/components/op-management/RaciMatrix";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import { getProject, listActivities, listGovernanceRoles, listRaciEntries, listResources, listStakeholders, listWbsNodes } from "@/lib/ppm/queries";
import { wbsLeafNodes } from "@/lib/ppm/wbs";

export default async function CadrageGovernancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/cadrage/gouvernance`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const [roles, raci, wbsNodes, activities, resources, stakeholders] = await Promise.all([
    listGovernanceRoles(supabase, id), listRaciEntries(supabase, id), listWbsNodes(supabase, id), listActivities(supabase, id),
    listResources(supabase, id), listStakeholders(supabase, id),
  ]);
  const workPackages = wbsLeafNodes(wbsNodes);
  const staff = resources.filter(item => item.type === "human" || item.type === "consultant");
  const locale = await getCurrentLocale();

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/projets", label: bc(locale, "projects") }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/cadrage/gouvernance`, label: bc(locale, "scoping") }]}>
    <ProjectShell project={project}>
      <div className="grid gap-8">
        <CadrageTabs projectId={id} />
        <GovernanceManager projectId={id} initial={roles} staff={staff} stakeholders={stakeholders} />
        <RaciMatrix projectId={id} roles={roles} initial={raci} workPackages={workPackages} activities={activities} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
