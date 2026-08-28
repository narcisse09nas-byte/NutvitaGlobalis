// Refinement program, Wave 1: one consistent unique-ID scheme for every registry entry —
// {org initials, max 3 letters}{domain letter}{4 random alphanumeric} (5 suffix characters,
// as requested), e.g. "NVGA7K2M" for an Achievement at an org coded "NVG". Purchase Orders use
// generateSequenceCode instead (no domain letter — the spec's own example is a plain
// 8-character org+random code, which is exactly org(3)+5 with no letter carved out of it).
import type { SupabaseClient } from "@supabase/supabase-js";

export type RegistryDomain =
  | "achievement" | "expense" | "purchase_request" | "risk" | "issue" | "ncr"
  | "communication_actual" | "stakeholder_interaction" | "feedback" | "deliverable"
  | "action" | "external_approval" | "evaluation" | "lesson_learned" | "handover" | "archive"
  | "distribution_operation" | "distribution_site" | "cooperative" | "product"
  | "distribution_need" | "distribution_plan" | "delivery_note" | "distribution_report"
  | "asset" | "asset_inventory_session";

const DOMAIN_CODES: Record<RegistryDomain, string> = {
  achievement: "A", expense: "E", purchase_request: "B", risk: "R", issue: "I", ncr: "N",
  communication_actual: "C", stakeholder_interaction: "S", feedback: "F", deliverable: "D",
  action: "X", external_approval: "V", evaluation: "M", lesson_learned: "L", handover: "H", archive: "Z",
  // Operations Management (distribution cycles) — unused letters only.
  distribution_operation: "O", distribution_site: "T", cooperative: "G", product: "P",
  distribution_need: "J", distribution_plan: "Q", delivery_note: "W", distribution_report: "U",
  // Project Asset Management — unused letters only.
  asset: "K", asset_inventory_session: "Y",
};

const ALPHANUMERIC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — avoids visual ambiguity

function randomChars(length: number) {
  let result = "";
  for (let i = 0; i < length; i += 1) result += ALPHANUMERIC[Math.floor(Math.random() * ALPHANUMERIC.length)];
  return result;
}

export function orgInitials(organizationCode?: string | null, organizationName?: string | null): string {
  const source = (organizationCode || organizationName || "NVG").replace(/[^a-zA-Z]/g, "").toUpperCase();
  return (source.slice(0, 3) || "NVG").padEnd(3, "X");
}

export function generateRegistryCode(orgCode: string, domain: RegistryDomain): string {
  return `${orgInitials(orgCode)}${DOMAIN_CODES[domain]}${randomChars(4)}`;
}

// Purchase Orders: org(3) + 5 random = 8 characters total, matching the spec's own example.
export function generateSequenceCode(_orgCode: string): string {
  return `PO-${randomChars(5)}`;
}

// Inserts are expected to retry once on a unique-constraint conflict (Postgres code 23505) —
// astronomically unlikely at 4-5 random chars over ~33 symbols, but a save must never crash for it.
export async function withUniqueRegistryCode<T>(
  attempt: (code: string) => Promise<{ data: T | null; error: { code?: string; message: string } | null }>,
  makeCode: () => string,
  maxAttempts = 3,
): Promise<{ data: T | null; error: { code?: string; message: string } | null }> {
  let lastResult: { data: T | null; error: { code?: string; message: string } | null } = { data: null, error: { message: "Aucune tentative effectuee." } };
  for (let i = 0; i < maxAttempts; i += 1) {
    lastResult = await attempt(makeCode());
    if (!lastResult.error || lastResult.error.code !== "23505") return lastResult;
  }
  return lastResult;
}

export async function getOrgCodeForProject(supabase: SupabaseClient, projectId: string): Promise<string> {
  const { data: project } = await supabase.from("ppm_projects").select("organization_id").eq("id", projectId).maybeSingle();
  if (!project?.organization_id) return "NVG";
  const { data: organization } = await supabase.from("ppm_organizations").select("code,name").eq("id", project.organization_id).maybeSingle();
  return orgInitials(organization?.code, organization?.name);
}

export async function getOrgCodeForOrganization(supabase: SupabaseClient, organizationId: string): Promise<string> {
  const { data: organization } = await supabase.from("ppm_organizations").select("code,name").eq("id", organizationId).maybeSingle();
  return orgInitials(organization?.code, organization?.name);
}

export async function getOrgCodeForOperation(supabase: SupabaseClient, operationId: string): Promise<string> {
  const { data: operation } = await supabase.from("ppm_ops_operations").select("organization_id").eq("id", operationId).maybeSingle();
  if (!operation?.organization_id) return "NVG";
  return getOrgCodeForOrganization(supabase, operation.organization_id);
}

// Generic scope-scoped sequential numbering (ppm_next_sequence RPC, row-locked upsert) — used for
// the project code and the new organization-level registries, distinct from the random-suffix
// generateRegistryCode() scheme above since these need small, gapless, human-legible numbers
// (e.g. "PROJ-01/26-NVG", "STAFF-003") rather than a collision-resistant random code.
export async function nextSequence(supabase: SupabaseClient, scopeId: string, kind: string, year = 0): Promise<number> {
  const { data, error } = await supabase.rpc("ppm_next_sequence", { p_scope_id: scopeId, p_kind: kind, p_year: year });
  if (error || typeof data !== "number") throw new Error(error?.message || "Sequence generation failed.");
  return data;
}

export async function generateProjectCode(supabase: SupabaseClient, organizationId: string): Promise<string> {
  const orgCode = await getOrgCodeForOrganization(supabase, organizationId);
  const year = new Date().getFullYear() % 100;
  const seq = await nextSequence(supabase, organizationId, "project", year);
  return `PROJ-${String(seq).padStart(2, "0")}/${String(year).padStart(2, "0")}-${orgCode}`;
}
