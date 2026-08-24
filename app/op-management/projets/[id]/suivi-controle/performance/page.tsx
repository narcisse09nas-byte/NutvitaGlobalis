import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import SuiviControleTabs from "@/components/op-management/SuiviControleTabs";
import EvmWorkspace from "@/components/op-management/EvmWorkspace";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import {
  getApprovedPmbWorkPackageSnapshots, getEvmSettings, getProject, listActivities, listAchievements,
  listBudgetLines, listChangeRequests, listExpenses, listEvmSnapshots, listIssues, listPmbVersions,
  listResources, listRisks, listTimePhasedBudgets, listWbsNodes,
} from "@/lib/ppm/queries";
import { wbsLeafNodes } from "@/lib/ppm/wbs";

export default async function SuiviControlePerformancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/suivi-controle/performance`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const project = await getProject(supabase, id);
  if (!project) notFound();

  const [settings, workPackages, budgetLines, activities, achievements, expenses, timePhasedRows, risks, issues, snapshots, changeRequests, pmbVersions, pmbSnapshots, resources] = await Promise.all([
    getEvmSettings(supabase, id), listWbsNodes(supabase, id), listBudgetLines(supabase, id), listActivities(supabase, id),
    listAchievements(supabase, id), listExpenses(supabase, id), listTimePhasedBudgets(supabase, id),
    listRisks(supabase, id), listIssues(supabase, id), listEvmSnapshots(supabase, id),
    listChangeRequests(supabase, id), listPmbVersions(supabase, id), getApprovedPmbWorkPackageSnapshots(supabase, id),
    listResources(supabase, id),
  ]);
  const workPackagesLevel4 = wbsLeafNodes(workPackages);
  const staff = resources.filter(item => item.type === "human" || item.type === "consultant");
  const locale = await getCurrentLocale();

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/projets", label: bc(locale, "projects") }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/suivi-controle/performance`, label: bc(locale, "monitoring") }]}>
    <ProjectShell project={project}>
      <div className="grid gap-5">
        <SuiviControleTabs projectId={id} />
        <EvmWorkspace
          projectId={id} project={project} initialSettings={settings} workPackages={workPackagesLevel4} budgetLines={budgetLines}
          activities={activities} achievements={achievements} expenses={expenses} timePhasedRows={timePhasedRows}
          risks={risks} issues={issues} initialSnapshots={snapshots} changeRequests={changeRequests} initialPmbVersions={pmbVersions}
          pmbSnapshots={pmbSnapshots} staff={staff}
        />
      </div>
    </ProjectShell>
  </PPMShell>;
}
