import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import SuiviControleTabs from "@/components/op-management/SuiviControleTabs";
import ApprovalRequestManager from "@/components/op-management/ApprovalRequestManager";
import ExternalApproverRegister from "@/components/op-management/ExternalApproverRegister";
import { createClient } from "@/lib/supabase/server";
import { getProject, listApprovalRequests, listExternalApprovers } from "@/lib/ppm/queries";

export default async function SuiviControleApprobationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/suivi-controle/approbations`)}`);
  const name = user.user_metadata?.full_name || user.email || "Utilisateur";
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const [approvalRequests, externalApprovers] = await Promise.all([listApprovalRequests(supabase, id), listExternalApprovers(supabase, id)]);

  return <PPMShell name={name} breadcrumbs={[{ href: "/op-management", label: "Vue d'ensemble" }, { href: "/op-management/projets", label: "Projets" }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/suivi-controle/approbations`, label: "Suivi & controle" }]}>
    <ProjectShell project={project}>
      <div className="grid gap-8">
        <SuiviControleTabs projectId={id} />
        <ExternalApproverRegister projectId={id} initial={externalApprovers} />
        <ApprovalRequestManager projectId={id} projectName={project.name} initial={approvalRequests} externalApprovers={externalApprovers} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
