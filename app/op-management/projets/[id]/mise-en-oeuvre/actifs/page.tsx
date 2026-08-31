import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import MiseEnOeuvreTabs from "@/components/op-management/MiseEnOeuvreTabs";
import AssetRegistrationManager from "@/components/op-management/AssetRegistrationManager";
import EquipmentCheckoutManager from "@/components/op-management/EquipmentCheckoutManager";
import AssetInventoryManager from "@/components/op-management/AssetInventoryManager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import { getProject, listActivities, listAssetInventorySessions, listEquipmentCheckouts, listProcurementItems, listProjects, listResources } from "@/lib/ppm/queries";

export default async function MiseEnOeuvreActifsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/mise-en-oeuvre/actifs`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const [resources, procurementItems, projects, activities, checkouts, inventorySessions] = await Promise.all([
    listResources(supabase, id), listProcurementItems(supabase, id), listProjects(supabase), listActivities(supabase, id), listEquipmentCheckouts(supabase, id), listAssetInventorySessions(supabase, id),
  ]);
  const assetResources = resources.filter(item => item.type === "equipment" || item.type === "vehicle" || item.type === "infrastructure" || item.type === "other");
  const assignedAssetIds = new Set(checkouts.map(item => item.resource_id));
  const registeredAssets = assetResources.filter(item => Boolean(item.origin_type || item.asset_code));
  const inventoryAssets = assetResources.filter(item => Boolean(item.origin_type || item.asset_code || assignedAssetIds.has(item.id)));
  const assignableAssets = registeredAssets.filter(item => item.status !== "on_hold" && item.asset_workflow_status === "approved");
  const staff = resources.filter(item => item.type === "human" || item.type === "consultant");
  const locale = await getCurrentLocale();

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/projets", label: bc(locale, "projects") }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/mise-en-oeuvre/actifs`, label: bc(locale, "implementation") }]}>
    <ProjectShell project={project}>
      <div className="grid gap-5">
        <MiseEnOeuvreTabs projectId={id} />
        <AssetRegistrationManager projectId={id} initial={assetResources} procurementItems={procurementItems} projects={projects} staff={staff} />
        <EquipmentCheckoutManager projectId={id} initial={checkouts} assets={assignableAssets} activities={activities} staff={staff} />
        <AssetInventoryManager projectId={id} initial={inventorySessions} assets={inventoryAssets} staff={staff} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
