import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import PlanificationTabs from "@/components/op-management/PlanificationTabs";
import BudgetManager from "@/components/op-management/BudgetManager";
import BudgetCategoryManager from "@/components/op-management/BudgetCategoryManager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import { getProject, listBudgetCategories, listBudgetLines, listOrganizationDonors, listOrganizationGrants, listWbsNodes } from "@/lib/ppm/queries";

export default async function PlanificationBudgetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/planification/budget`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const locale = await getCurrentLocale();
  const [budgetLines, wbsNodes, budgetCategories, donors, grants] = await Promise.all([
    listBudgetLines(supabase, id), listWbsNodes(supabase, id), listBudgetCategories(supabase, id), listOrganizationDonors(supabase, project.organization_id), listOrganizationGrants(supabase, project.organization_id),
  ]);

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/projets", label: bc(locale, "projects") }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/planification/budget`, label: bc(locale, "planning") }]}>
    <ProjectShell project={project}>
      <div className="grid gap-5">
        <PlanificationTabs projectId={id} />
        <BudgetCategoryManager projectId={id} initial={budgetCategories} />
        <BudgetManager projectId={id} initial={budgetLines} wbsNodes={wbsNodes} budgetCategories={budgetCategories} donors={donors} grants={grants} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
