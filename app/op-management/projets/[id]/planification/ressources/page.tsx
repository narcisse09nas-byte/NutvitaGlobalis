import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import PlanificationTabs from "@/components/op-management/PlanificationTabs";
import ResourceManager from "@/components/op-management/ResourceManager";
import TimesheetManager from "@/components/op-management/TimesheetManager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import {
  getProject, listActivities, listResourceAssignments, listResources,
  listTimesheets, listWbsNodes,
} from "@/lib/ppm/queries";

export default async function PlanificationRessourcesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/planification/ressources`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const [resources, assignments, activities, wbsNodes, timesheets] = await Promise.all([
    listResources(supabase, id), listResourceAssignments(supabase, id), listActivities(supabase, id),
    listWbsNodes(supabase, id), listTimesheets(supabase, id),
  ]);
  const otherResources = resources.filter(item => ["service", "consumable", "material", "other"].includes(item.type));
  const locale = await getCurrentLocale();
  const en = locale === "en";

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/projets", label: bc(locale, "projects") }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/planification/ressources`, label: bc(locale, "planning") }]}>
    <ProjectShell project={project}>
      <div className="grid gap-8">
        <PlanificationTabs projectId={id} />
        <p className="rounded-2xl bg-mint/40 p-4 text-sm text-forest">{en ? <>Staff and consultants are managed from the project's <b>Team</b> tab. This page only covers the planning of other resources, notably services, materials and consumables. Asset registration, assignment and physical inventory are handled in the Implementation phase&apos;s <b>Assets</b> tab.</> : <>Le personnel et les consultants se gerent depuis l&apos;onglet <b>Equipe</b> du projet. Cette page couvre uniquement la planification des autres ressources, notamment les services, le materiel et les consommables. L&apos;enregistrement, l&apos;attribution et l&apos;inventaire physique des actifs se gerent depuis l&apos;onglet <b>Actifs</b> de la phase Mise en oeuvre.</>}</p>
        <ResourceManager projectId={id} initial={otherResources} initialAssignments={assignments} activities={activities} title={en ? "Services, materials & consumables" : "Service, materiel & consommable"} allowedTypes={["consumable", "material", "service", "other"]} />
        <TimesheetManager projectId={id} initial={timesheets} resources={resources} wbsNodes={wbsNodes} activities={activities} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
