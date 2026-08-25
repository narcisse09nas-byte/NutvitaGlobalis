import type { SupabaseClient } from "@supabase/supabase-js";

// Purchase order / invoice numbering — the spec mandates a human-readable format distinct from
// the 8-char registry codes elsewhere in PPM: "{school initials}/{MM}/{YY}/{NN}" for POs and
// "Fact n deg {initials}/{NN}/{MM}/{YY}" for invoices. The sequence (NN) is per-site, per-kind,
// per-month, reserved via public.ppm_ops_next_sequence's row-locked upsert (supabase/ppm-ops-
// mise-en-oeuvre-sf.sql) so concurrent submissions never collide — a plain count(*)+1 would race.
export type OpsSequenceKind = "purchase_order" | "invoice";

function pad2(value: number) { return String(value).padStart(2, "0"); }
function yy(year: number) { return String(year).slice(-2); }

async function nextOpsSequence(supabase: SupabaseClient, siteId: string, kind: OpsSequenceKind, year: number, month: number): Promise<number> {
  const { data, error } = await supabase.rpc("ppm_ops_next_sequence", { p_site_id: siteId, p_kind: kind, p_year: year, p_month: month });
  if (error || data == null) throw new Error(error?.message || "Generation du numero de sequence impossible.");
  return data as number;
}

export function formatPoNumber(schoolInitials: string, month: number, year: number, orderSeq: number): string {
  return `${schoolInitials.toUpperCase().slice(0, 3)}/${pad2(month)}/${yy(year)}/${pad2(orderSeq)}`;
}

export function formatInvoiceNumber(schoolInitials: string, orderSeq: number, month: number, year: number): string {
  return `Fact n° ${schoolInitials.toUpperCase().slice(0, 3)}/${pad2(orderSeq)}/${pad2(month)}/${yy(year)}`;
}

export async function generatePoNumber(supabase: SupabaseClient, siteId: string, schoolInitials: string, date = new Date()): Promise<string> {
  const month = date.getMonth() + 1, year = date.getFullYear();
  const seq = await nextOpsSequence(supabase, siteId, "purchase_order", year, month);
  return formatPoNumber(schoolInitials, month, year, seq);
}

export async function generateInvoiceNumber(supabase: SupabaseClient, siteId: string, schoolInitials: string, date = new Date()): Promise<string> {
  const month = date.getMonth() + 1, year = date.getFullYear();
  const seq = await nextOpsSequence(supabase, siteId, "invoice", year, month);
  return formatInvoiceNumber(schoolInitials, seq, month, year);
}
