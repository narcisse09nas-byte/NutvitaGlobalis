import type { SupabaseClient } from "@supabase/supabase-js";

// Refinement program, Wave 4: one shared "is this record finalized, and can the current user
// override it anyway" pair — reused by every register that needs immutability instead of a
// bespoke lock check per entity (item 33: applies platform-wide, starting with Expenses/
// Procurement here; later waves' registers reuse the same two helpers).
export type LockableEntity = "expense" | "procurement" | "achievement" | "deliverable" | "ncr" | "risk_review";

const FINAL_STATUSES: Record<LockableEntity, string[]> = {
  expense: ["posted"],
  procurement: ["completed"],
  achievement: ["validated"],
  deliverable: ["accepted"],
  ncr: ["closed"],
  risk_review: ["closed"],
};

export function isFinalStatus(entity: LockableEntity, status: string): boolean {
  return FINAL_STATUSES[entity].includes(status);
}

// Mirrors the public.is_super_admin() Postgres function (accounts-growth-admin.sql) — the only
// admin concept that exists sitewide today. Wave 9 will extend override eligibility to
// project-scoped admins once that role model exists.
export async function checkIsSuperAdmin(supabase: SupabaseClient): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("admin_users").select("role,active").eq("id", user.id).maybeSingle();
  return !!data?.active && data.role === "super_admin";
}
