import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import ReportingTabs from "@/components/op-management/ReportingTabs";
import ReportManager from "@/components/op-management/ReportManager";
import { createClient } from "@/lib/supabase/server";
import { getProject, listReports } from "@/lib/ppm/queries";

export default async function ReportingRapportsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/reporting/rapports`)}`);
  const name = user.user_metadata?.full_name || user.email || "Utilisateur";
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const reports = await listReports(supabase, id);

  return <PPMShell name={name} breadcrumbs={[{ href: "/op-management", label: "Vue d'ensemble" }, { href: "/op-management/projets", label: "Projets" }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/reporting/rapports`, label: "Reporting" }]}>
    <ProjectShell project={project}>
      <div className="grid gap-5">
        <ReportingTabs projectId={id} />
        <ReportManager projectId={id} initial={reports} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
