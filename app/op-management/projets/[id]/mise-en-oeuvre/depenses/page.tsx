import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import MiseEnOeuvreTabs from "@/components/op-management/MiseEnOeuvreTabs";
import ExpenseManager from "@/components/op-management/ExpenseManager";
import { createClient } from "@/lib/supabase/server";
import { getProject, listActivities, listBudgetLines, listExpenses, listProcurementItems, listWbsNodes } from "@/lib/ppm/queries";

export default async function MiseEnOeuvreDepensesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/mise-en-oeuvre/depenses`)}`);
  const name = user.user_metadata?.full_name || user.email || "Utilisateur";
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const [expenses, budgetLines, wbsNodes, activities, procurementItems] = await Promise.all([
    listExpenses(supabase, id), listBudgetLines(supabase, id), listWbsNodes(supabase, id), listActivities(supabase, id), listProcurementItems(supabase, id),
  ]);

  return <PPMShell name={name} breadcrumbs={[{ href: "/op-management", label: "Vue d'ensemble" }, { href: "/op-management/projets", label: "Projets" }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/mise-en-oeuvre/depenses`, label: "Mise en oeuvre" }]}>
    <ProjectShell project={project}>
      <div className="grid gap-5">
        <MiseEnOeuvreTabs projectId={id} />
        <ExpenseManager projectId={id} initial={expenses} budgetLines={budgetLines} wbsNodes={wbsNodes} activities={activities} procurementItems={procurementItems} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
