import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import ActivityDetailView from "@/components/op-management/ActivityDetailView";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import {
  getActivity, getProject, getWbsNode, listActivityAchievements, listDeliverables, listExpenses,
  listIssues, listNcrs, listProcurementItems, listQualityRequirements, listResultChain, listRisks,
} from "@/lib/ppm/queries";

export default async function ActivityDetailPage({ params }: { params: Promise<{ id: string; activityId: string }> }) {
  const { id, activityId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/activites/${activityId}`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const activity = await getActivity(supabase, activityId);
  if (!activity || activity.project_id !== id) notFound();
  const locale = await getCurrentLocale();

  const [workPackage, resultChain, achievements, expenses, procurementItems, qualityRequirements, ncrs, risks, issues, deliverables] = await Promise.all([
    activity.work_package_id ? getWbsNode(supabase, activity.work_package_id) : Promise.resolve(null),
    listResultChain(supabase, id),
    listActivityAchievements(supabase, activityId),
    listExpenses(supabase, id), listProcurementItems(supabase, id), listQualityRequirements(supabase, id), listNcrs(supabase, id),
    listRisks(supabase, id), listIssues(supabase, id), listDeliverables(supabase, id),
  ]);
  const output = activity.output_id ? resultChain.find(node => node.id === activity.output_id) || null : null;
  const activityQualityRequirements = qualityRequirements.filter(item => item.activity_id === activityId);
  const relevantNcrs = ncrs.filter(item => activityQualityRequirements.some(req => req.id === item.quality_requirement_id));

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/projets", label: bc(locale, "projects") }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/activites/${activityId}`, label: activity.title }]}>
    <ProjectShell project={project}>
      <ActivityDetailView
        projectId={id} activity={activity} workPackage={workPackage} output={output}
        achievements={achievements}
        expenses={expenses.filter(item => item.activity_id === activityId)}
        procurementItems={procurementItems.filter(item => item.activity_id === activityId)}
        qualityRequirements={activityQualityRequirements}
        ncrs={relevantNcrs}
        risks={risks.filter(item => item.work_package_id && item.work_package_id === activity.work_package_id)}
        issues={issues.filter(item => item.activity_id === activityId || (item.work_package_id && item.work_package_id === activity.work_package_id))}
        deliverables={deliverables.filter(item => item.activity_id === activityId)}
        locale={locale}
      />
    </ProjectShell>
  </PPMShell>;
}
