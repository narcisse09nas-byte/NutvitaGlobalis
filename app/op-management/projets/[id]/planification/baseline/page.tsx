import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import PlanificationTabs from "@/components/op-management/PlanificationTabs";
import ScopeBaselineManager from "@/components/op-management/ScopeBaselineManager";
import ChangeRequestManager from "@/components/op-management/ChangeRequestManager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import { getProject, listChangeRequests, listResources, listScopeBaselines } from "@/lib/ppm/queries";

export default async function PlanificationBaselinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/planification/baseline`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const locale = await getCurrentLocale();
  const [baselines, changeRequests, resources] = await Promise.all([listScopeBaselines(supabase, id), listChangeRequests(supabase, id), listResources(supabase, id)]);
  const staff = resources.filter(item => item.type === "human" || item.type === "consultant");

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/projets", label: bc(locale, "projects") }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/planification/baseline`, label: bc(locale, "planning") }]}>
    <ProjectShell project={project}>
      <div className="grid gap-8">
        <PlanificationTabs projectId={id} />
        <ScopeBaselineManager projectId={id} initial={baselines} />
        <ChangeRequestManager projectId={id} initial={changeRequests} staff={staff} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
