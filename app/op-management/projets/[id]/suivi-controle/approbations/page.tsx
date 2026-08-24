import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import SuiviControleTabs from "@/components/op-management/SuiviControleTabs";
import ApprovalRequestManager from "@/components/op-management/ApprovalRequestManager";
import ExternalApproverRegister from "@/components/op-management/ExternalApproverRegister";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import { getProject, listApprovalRequests, listExternalApprovers, listResources } from "@/lib/ppm/queries";

export default async function SuiviControleApprobationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/suivi-controle/approbations`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const [approvalRequests, externalApprovers, resources] = await Promise.all([listApprovalRequests(supabase, id), listExternalApprovers(supabase, id), listResources(supabase, id)]);
  const staff = resources.filter(item => item.type === "human" || item.type === "consultant");
  const locale = await getCurrentLocale();

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/projets", label: bc(locale, "projects") }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/suivi-controle/approbations`, label: bc(locale, "monitoring") }]}>
    <ProjectShell project={project}>
      <div className="grid gap-8">
        <SuiviControleTabs projectId={id} />
        <ExternalApproverRegister projectId={id} initial={externalApprovers} />
        <ApprovalRequestManager projectId={id} projectName={project.name} initial={approvalRequests} externalApprovers={externalApprovers} staff={staff} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
