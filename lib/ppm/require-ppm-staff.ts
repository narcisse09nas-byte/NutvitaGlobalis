import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireActivePlatformSession } from "@/lib/active-platform-session";
import type { PPMResource } from "@/lib/ppm/types";

// Mirrors lib/ppm/require-distribution-partner.ts for the new project-asset self-service portal —
// a PPM resource (staff/consultant) who has had a login provisioned via app/api/ppm/staff, now
// landing in their own minimal space to endorse/return assigned assets.
export async function requirePpmStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/api/access/open?service=project_management&role=ppm_staff");
  await requireActivePlatformSession(["project_management"], "ppm_staff");
  const { data: resources } = await supabase.from("ppm_resources").select("*").eq("user_id", user.id);
  if (!resources?.length) redirect("/mon-espace-ppm/connexion?acces=staff-requis");
  return { supabase, user, resources: resources as PPMResource[] };
}
