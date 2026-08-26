import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import CadrageTabs from "@/components/op-management/CadrageTabs";
import ScopeStatementForm from "@/components/op-management/ScopeStatementForm";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import { getProject, getScopeStatement, listChangeRequests, listScopeBaselines } from "@/lib/ppm/queries";

export default async function CadrageScopePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ changeRequest?: string; baseline?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/cadrage/perimetre`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const locale = await getCurrentLocale();
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const [scopeStatement, baselines, changeRequests] = await Promise.all([getScopeStatement(supabase, id), listScopeBaselines(supabase, id), listChangeRequests(supabase, id)]);
  const latest = baselines[0];
  const activeDraft = query.baseline ? baselines.find(item => item.id === query.baseline && item.status === "draft") : null;
  const locked = latest?.status === "baseline" && !activeDraft;
  const approvedChanges = changeRequests.filter(item => item.status === "approved" && item.request_code);

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/projets", label: bc(locale, "projects") }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/cadrage/perimetre`, label: bc(locale, "scoping") }]}>
    <ProjectShell project={project}>
      <div className="grid gap-5">
        <CadrageTabs projectId={id} />
        <ScopeStatementForm projectId={id} initial={scopeStatement} locked={locked} changeRequests={approvedChanges} selectedChangeRequestId={query.changeRequest || ""} baselineId={activeDraft?.id || ""} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
