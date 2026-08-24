import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import SuiviControleTabs from "@/components/op-management/SuiviControleTabs";
import StakeholderRegister from "@/components/op-management/StakeholderRegister";
import CommunicationPlanManager from "@/components/op-management/CommunicationPlanManager";
import CommunicationActualsManager from "@/components/op-management/CommunicationActualsManager";
import StakeholderInteractionManager from "@/components/op-management/StakeholderInteractionManager";
import { createClient } from "@/lib/supabase/server";
import {
  getProject, listCommunicationActuals, listCommunicationItems, listResources, listStakeholderInteractions, listStakeholders,
} from "@/lib/ppm/queries";

export default async function SuiviControlePartiesPrenantesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/suivi-controle/parties-prenantes`)}`);
  const name = user.user_metadata?.full_name || user.email || "Utilisateur";
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const [stakeholders, communicationItems, communicationActuals, stakeholderInteractions, resources] = await Promise.all([
    listStakeholders(supabase, id), listCommunicationItems(supabase, id),
    listCommunicationActuals(supabase, id), listStakeholderInteractions(supabase, id), listResources(supabase, id),
  ]);
  const staff = resources.filter(item => item.type === "human" || item.type === "consultant");

  return <PPMShell name={name} breadcrumbs={[{ href: "/op-management", label: "Vue d'ensemble" }, { href: "/op-management/projets", label: "Projets" }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/suivi-controle/parties-prenantes`, label: "Suivi & controle" }]}>
    <ProjectShell project={project}>
      <div className="grid gap-8">
        <SuiviControleTabs projectId={id} />
        <StakeholderRegister projectId={id} initial={stakeholders} />
        <CommunicationPlanManager projectId={id} initial={communicationItems} stakeholders={stakeholders} staff={staff} />
        <CommunicationActualsManager projectId={id} initial={communicationActuals} communicationItems={communicationItems} stakeholders={stakeholders} />
        <StakeholderInteractionManager projectId={id} initial={stakeholderInteractions} stakeholders={stakeholders} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
