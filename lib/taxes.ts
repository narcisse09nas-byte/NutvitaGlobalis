import type { SupabaseClient } from "@supabase/supabase-js";
export type TaxScope = "formation" | "consultation" | "subscription";

export async function getApplicableTax(supabase: SupabaseClient, countryCode?: string | null, scope: TaxScope = "subscription") {
  const today = new Date().toISOString().slice(0, 10), scopeColumn = scope === "formation" ? "applies_to_formations" : scope === "consultation" ? "applies_to_consultations" : "applies_to_subscriptions";
  const base = () => supabase.from("tax_rates").select("*").eq("active", true).eq(scopeColumn, true).lte("effective_from", today).or(`effective_to.is.null,effective_to.gte.${today}`).order("effective_from", { ascending: false }).limit(1);
  if (countryCode) { const { data } = await base().eq("country_code", countryCode).maybeSingle(); if (data) return data; }
  const { data } = await base().is("country_code", null).maybeSingle();
  return data || { name: "Taxe", rate: 0, country_code: null, [scopeColumn]: true };
}
export function priceBreakdown(priceExcludingTax:number,rate:number){const taxAmount=Math.round(priceExcludingTax*rate)/100,total=priceExcludingTax+taxAmount;return{priceExcludingTax,taxRate:rate,taxAmount,totalIncludingTax:total}}
