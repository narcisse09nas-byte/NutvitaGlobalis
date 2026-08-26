import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

// Mirrors app/api/admin/medical-specialists' toggle_free_onsite_creation action, for the
// nutritionist/dietitian side — symmetric admin-grantable, revocable-at-any-time exception to the
// centralized-invoicing requirement (hospital-partnership free consultations).
export async function POST(request: Request) {
  const { user } = await requireAdmin();
  const body = await request.json().catch(() => ({}));
  if (body.action !== "toggle_free_onsite_creation") return NextResponse.json({ message: "Action invalide." }, { status: 400 });

  const service = createAdminClient();
  const { error } = await service.from("dietitian_profiles").update({
    free_onsite_creation: !!body.enabled,
    free_onsite_creation_granted_by: user.id,
    free_onsite_creation_granted_at: new Date().toISOString(),
  }).eq("id", body.id);
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
