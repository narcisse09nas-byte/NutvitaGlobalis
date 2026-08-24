import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import ReportingTabs from "@/components/op-management/ReportingTabs";
import DeliverableManager from "@/components/op-management/DeliverableManager";
import DocumentRegister from "@/components/op-management/DocumentRegister";
import { createClient } from "@/lib/supabase/server";
import { getProject, listActivities, listDeliverables, listDocuments, listExternalApprovers, listWbsNodes } from "@/lib/ppm/queries";

export default async function ReportingLivrablesDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/reporting/livrables-documents`)}`);
  const name = user.user_metadata?.full_name || user.email || "Utilisateur";
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const [deliverables, documents, wbsNodes, activities, externalApprovers] = await Promise.all([
    listDeliverables(supabase, id), listDocuments(supabase, id), listWbsNodes(supabase, id), listActivities(supabase, id),
    listExternalApprovers(supabase, id),
  ]);

  return <PPMShell name={name} breadcrumbs={[{ href: "/op-management", label: "Vue d'ensemble" }, { href: "/op-management/projets", label: "Projets" }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/reporting/livrables-documents`, label: "Reporting" }]}>
    <ProjectShell project={project}>
      <div className="grid gap-8">
        <ReportingTabs projectId={id} />
        <DeliverableManager projectId={id} initial={deliverables} wbsNodes={wbsNodes} activities={activities} externalApprovers={externalApprovers} />
        <DocumentRegister projectId={id} initial={documents} deliverables={deliverables} wbsNodes={wbsNodes} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
