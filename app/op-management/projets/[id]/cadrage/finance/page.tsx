import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import CadrageTabs from "@/components/op-management/CadrageTabs";
import FinanceConfigurationManager from "@/components/op-management/FinanceConfigurationManager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getProject, getProjectFinanceSettings, listCostCenters, listOrganizationSuppliers, listProjectContracts, listResources } from "@/lib/ppm/queries";

export default async function FinanceConfigurationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion"); const project = await getProject(supabase, id); if (!project) notFound();
  const locale = await getCurrentLocale();
  const [settings, centers, contracts, resources, suppliers] = await Promise.all([
    getProjectFinanceSettings(supabase,id), listCostCenters(supabase,id), listProjectContracts(supabase,id),
    listResources(supabase,id), listOrganizationSuppliers(supabase,project.organization_id),
  ]);
  return <PPMShell name={user.user_metadata?.full_name||user.email||"Utilisateur"} locale={locale} breadcrumbs={[]}><ProjectShell project={project}><div className="grid gap-5"><CadrageTabs projectId={id}/><FinanceConfigurationManager projectId={id} initialSettings={settings} initialCenters={centers} initialContracts={contracts} staff={resources.filter(x=>x.type==="human"||x.type==="consultant")} suppliers={suppliers}/></div></ProjectShell></PPMShell>;
}
