import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import SuiviControleTabs from "@/components/op-management/SuiviControleTabs";
import RiskRegister from "@/components/op-management/RiskRegister";
import IssueManager from "@/components/op-management/IssueManager";
import { createClient } from "@/lib/supabase/server";
import { getProject, listActivities, listIssues, listResources, listRiskReviews, listRisks, listWbsNodes } from "@/lib/ppm/queries";

export default async function SuiviControleRisquesIssuesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/suivi-controle/risques-issues`)}`);
  const name = user.user_metadata?.full_name || user.email || "Utilisateur";
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const [risks, issues, wbsNodes, activities, riskReviews, resources] = await Promise.all([
    listRisks(supabase, id), listIssues(supabase, id), listWbsNodes(supabase, id), listActivities(supabase, id),
    listRiskReviews(supabase, id), listResources(supabase, id),
  ]);
  const staff = resources.filter(item => item.type === "human" || item.type === "consultant");

  return <PPMShell name={name} breadcrumbs={[{ href: "/op-management", label: "Vue d'ensemble" }, { href: "/op-management/projets", label: "Projets" }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/suivi-controle/risques-issues`, label: "Suivi & controle" }]}>
    <ProjectShell project={project}>
      <div className="grid gap-8">
        <SuiviControleTabs projectId={id} />
        <RiskRegister projectId={id} initial={risks} initialReviews={riskReviews} staff={staff} />
        <IssueManager projectId={id} initial={issues} wbsNodes={wbsNodes} activities={activities} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
