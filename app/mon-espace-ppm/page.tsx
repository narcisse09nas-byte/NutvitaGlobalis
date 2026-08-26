import { requirePpmStaff } from "@/lib/ppm/require-ppm-staff";
import PpmStaffShell from "@/components/ppm-staff/PpmStaffShell";
import MyAssetsPanel from "@/components/ppm-staff/MyAssetsPanel";
import type { EquipmentCheckout, PPMResource } from "@/lib/ppm/types";

export const metadata = { title: "Mes actifs | Mon espace PPM" };

export default async function PpmStaffHomePage() {
  const { supabase, user, resources } = await requirePpmStaff();
  const resourceIds = resources.map(item => item.id);
  const { data: checkouts } = await supabase.from("ppm_equipment_checkouts").select("*").in("assigned_resource_id", resourceIds).order("created_at", { ascending: false });
  const typedCheckouts = (checkouts || []) as EquipmentCheckout[];
  const assetIds = Array.from(new Set(typedCheckouts.map(item => item.resource_id)));
  const { data: assets } = assetIds.length ? await supabase.from("ppm_resources").select("*").in("id", assetIds) : { data: [] as PPMResource[] };

  return <PpmStaffShell name={user.user_metadata?.full_name || user.email || "Utilisateur"}>
    <MyAssetsPanel initial={typedCheckouts} assets={(assets || []) as PPMResource[]} />
  </PpmStaffShell>;
}
