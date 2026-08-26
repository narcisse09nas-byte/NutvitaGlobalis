import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import PlanificationTabs from "@/components/op-management/PlanificationTabs";
import WBSTreeEditor from "@/components/op-management/WBSTreeEditor";
import WBSDictionaryView from "@/components/op-management/WBSDictionaryView";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import { getProject, listChangeRequests, listResources, listScopeBaselines, listWbsNodes } from "@/lib/ppm/queries";

export default async function PlanificationWbsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ changeRequest?: string; baseline?: string; step?: string; view?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/planification/wbs`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const locale = await getCurrentLocale();
  const [wbsNodes, resources, baselines, changeRequests] = await Promise.all([listWbsNodes(supabase, id), listResources(supabase, id), listScopeBaselines(supabase, id), listChangeRequests(supabase, id)]);
  const latest = baselines[0];
  const activeDraft = query.baseline ? baselines.find(item => item.id === query.baseline && item.status === "draft") : null;
  const locked = latest?.status === "baseline" && !activeDraft;
  const approvedChanges = changeRequests.filter(item => item.status === "approved" && item.request_code);
  const staff = resources.filter(item => (item.type === "human" || item.type === "consultant") && item.status === "active");

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/projets", label: bc(locale, "projects") }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/planification/wbs`, label: bc(locale, "planning") }]}>
    <ProjectShell project={project}>
      <div className="grid gap-5">
        <PlanificationTabs projectId={id} />
        <WBSTreeEditor projectId={id} initial={wbsNodes} staff={staff} locked={locked} changeRequests={approvedChanges} selectedChangeRequestId={query.changeRequest || ""} baselineId={activeDraft?.id || ""} />
        <WBSDictionaryView nodes={wbsNodes} projectId={id} baselineId={activeDraft?.id || ""} selectedChangeRequestId={query.changeRequest || ""} changeRequests={approvedChanges} workflow={query.step === "dictionary" && Boolean(activeDraft)} initiallyOpen={query.view === "dictionary"} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
