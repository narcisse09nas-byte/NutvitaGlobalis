import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import MiseEnOeuvreTabs from "@/components/op-management/MiseEnOeuvreTabs";
import ProcurementPipeline from "@/components/op-management/ProcurementPipeline";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import { getProject, listBudgetLines, listCostCenters, listOrganizationSuppliers, listProcurementItems, listProjectContracts, listResources, listWbsNodes } from "@/lib/ppm/queries";

export default async function MiseEnOeuvreProcurementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/mise-en-oeuvre/procurement`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const [procurementItems, wbsNodes, resources, budgetLines, costCenters, suppliers, contracts] = await Promise.all([listProcurementItems(supabase, id), listWbsNodes(supabase, id), listResources(supabase, id), listBudgetLines(supabase, id), listCostCenters(supabase, id), listOrganizationSuppliers(supabase, project.organization_id), listProjectContracts(supabase, id)]);
  const staff = resources.filter(item => item.type === "human" || item.type === "consultant");
  const locale = await getCurrentLocale();

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/projets", label: bc(locale, "projects") }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/mise-en-oeuvre/procurement`, label: bc(locale, "implementation") }]}>
    <ProjectShell project={project}>
      <div className="grid gap-5">
        <MiseEnOeuvreTabs projectId={id} />
        <ProcurementPipeline projectId={id} initial={procurementItems} wbsNodes={wbsNodes} staff={staff} budgetLines={budgetLines} costCenters={costCenters} suppliers={suppliers} contracts={contracts} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
