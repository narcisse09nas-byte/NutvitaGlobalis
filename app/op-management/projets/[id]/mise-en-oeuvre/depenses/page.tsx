import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import MiseEnOeuvreTabs from "@/components/op-management/MiseEnOeuvreTabs";
import ExpenseManager from "@/components/op-management/ExpenseManager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import { getProject, listActivities, listBudgetCategories, listBudgetLines, listExpenses, listProcurementItems, listResources, listWbsNodes } from "@/lib/ppm/queries";

export default async function MiseEnOeuvreDepensesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/mise-en-oeuvre/depenses`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const [expenses, budgetLines, wbsNodes, activities, procurementItems, budgetCategories, resources] = await Promise.all([
    listExpenses(supabase, id), listBudgetLines(supabase, id), listWbsNodes(supabase, id), listActivities(supabase, id),
    listProcurementItems(supabase, id), listBudgetCategories(supabase, id), listResources(supabase, id),
  ]);
  const staff = resources.filter(item => item.type === "human" || item.type === "consultant");
  const locale = await getCurrentLocale();

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/projets", label: bc(locale, "projects") }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/mise-en-oeuvre/depenses`, label: bc(locale, "implementation") }]}>
    <ProjectShell project={project}>
      <div className="grid gap-5">
        <MiseEnOeuvreTabs projectId={id} />
        <ExpenseManager projectId={id} initial={expenses} budgetLines={budgetLines} wbsNodes={wbsNodes} activities={activities} procurementItems={procurementItems} budgetCategories={budgetCategories} staff={staff} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
