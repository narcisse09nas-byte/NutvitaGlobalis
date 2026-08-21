import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import PlanificationTabs from "@/components/op-management/PlanificationTabs";
import ResourceManager from "@/components/op-management/ResourceManager";
import TimesheetManager from "@/components/op-management/TimesheetManager";
import EquipmentCheckoutManager from "@/components/op-management/EquipmentCheckoutManager";
import { createClient } from "@/lib/supabase/server";
import {
  getProject, listActivities, listEquipmentCheckouts, listResourceAssignments, listResources,
  listTimesheets, listWbsNodes,
} from "@/lib/ppm/queries";

export default async function PlanificationRessourcesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/planification/ressources`)}`);
  const name = user.user_metadata?.full_name || user.email || "Utilisateur";
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const [resources, assignments, activities, wbsNodes, timesheets, checkouts] = await Promise.all([
    listResources(supabase, id), listResourceAssignments(supabase, id), listActivities(supabase, id),
    listWbsNodes(supabase, id), listTimesheets(supabase, id), listEquipmentCheckouts(supabase, id),
  ]);
  const equipment = resources.filter(item => item.type === "equipment");

  return <PPMShell name={name} breadcrumbs={[{ href: "/op-management", label: "Vue d'ensemble" }, { href: "/op-management/projets", label: "Projets" }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/planification/ressources`, label: "Planification" }]}>
    <ProjectShell project={project}>
      <div className="grid gap-8">
        <PlanificationTabs projectId={id} />
        <ResourceManager projectId={id} initial={resources} initialAssignments={assignments} activities={activities} />
        <TimesheetManager projectId={id} initial={timesheets} resources={resources} wbsNodes={wbsNodes} activities={activities} />
        <EquipmentCheckoutManager projectId={id} initial={checkouts} equipment={equipment} activities={activities} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
