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
  const assetResources = resources.filter(item => item.type === "equipment" || item.type === "vehicle" || item.type === "infrastructure");

  return <PPMShell name={name} breadcrumbs={[{ href: "/op-management", label: "Vue d'ensemble" }, { href: "/op-management/projets", label: "Projets" }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/planification/ressources`, label: "Planification" }]}>
    <ProjectShell project={project}>
      <div className="grid gap-8">
        <PlanificationTabs projectId={id} />
        <p className="rounded-2xl bg-mint/40 p-4 text-sm text-forest">Le personnel et les consultants se gerent desormais depuis l&apos;onglet <b>Equipe</b> du projet. Cette page couvre les actifs, equipements et leur affectation.</p>
        <ResourceManager projectId={id} initial={assetResources} initialAssignments={assignments} activities={activities} title="Actifs & equipements" allowedTypes={["equipment", "vehicle", "infrastructure"]} />
        <TimesheetManager projectId={id} initial={timesheets} resources={resources} wbsNodes={wbsNodes} activities={activities} />
        <EquipmentCheckoutManager projectId={id} initial={checkouts} equipment={equipment} activities={activities} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
