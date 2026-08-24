import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import ProjectClosureWorkspace from "@/components/op-management/ProjectClosureWorkspace";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import {
  getProject, getProjectClosure, listActivities, listArchiveItems, listBudgetLines, listDeliverables,
  listDocuments, listEvaluations, listHandoverItems, listLessonsLearned, listProcurementItems,
  listResources, listStakeholders,
} from "@/lib/ppm/queries";

export default async function ProjectClosurePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/cloture`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const [closure, deliverables, activities, procurementItems, budgetLines, evaluations, lessonsLearned, handoverItems, archiveItems, documents, resources, stakeholders] = await Promise.all([
    getProjectClosure(supabase, id), listDeliverables(supabase, id), listActivities(supabase, id),
    listProcurementItems(supabase, id), listBudgetLines(supabase, id), listEvaluations(supabase, id), listLessonsLearned(supabase, id),
    listHandoverItems(supabase, id), listArchiveItems(supabase, id), listDocuments(supabase, id), listResources(supabase, id), listStakeholders(supabase, id),
  ]);
  const budgetBalance = budgetLines.reduce((sum, row) => sum + Number(row.revised_budget ?? row.initial_budget ?? 0) - Number(row.spent_amount || 0), 0);
  const staff = resources.filter(item => item.type === "human" || item.type === "consultant");
  const locale = await getCurrentLocale();

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/projets", label: bc(locale, "projects") }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/cloture`, label: bc(locale, "closure") }]}>
    <ProjectShell project={project}>
      <ProjectClosureWorkspace
        projectId={id} project={project} initial={closure} deliverables={deliverables}
        activitiesTotal={activities.length} activitiesCompleted={activities.filter(activity => activity.status === "completed").length}
        procurementItems={procurementItems} budgetBalance={budgetBalance} evaluations={evaluations} lessonsLearnedCount={lessonsLearned.length}
        initialHandoverItems={handoverItems} initialArchiveItems={archiveItems} documents={documents} staff={staff} stakeholders={stakeholders}
      />
    </ProjectShell>
  </PPMShell>;
}
