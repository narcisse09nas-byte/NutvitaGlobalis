import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import ReportingTabs from "@/components/op-management/ReportingTabs";
import ReportManager from "@/components/op-management/ReportManager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import { getProject, listReports, listResources } from "@/lib/ppm/queries";

export default async function ReportingRapportsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/reporting/rapports`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const [reports, resources] = await Promise.all([listReports(supabase, id), listResources(supabase, id)]);
  const staff = resources.filter(item => item.type === "human" || item.type === "consultant");
  const locale = await getCurrentLocale();

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/projets", label: bc(locale, "projects") }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/reporting/rapports`, label: bc(locale, "reporting") }]}>
    <ProjectShell project={project}>
      <div className="grid gap-5">
        <ReportingTabs projectId={id} />
        <ReportManager projectId={id} initial={reports} staff={staff} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
