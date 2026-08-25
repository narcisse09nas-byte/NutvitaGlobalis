"use client";
import { createClient } from "@/lib/supabase/client";
import { notifyPpmEventClient } from "@/lib/ppm/notify-client";

// Wave 9 polish: the internal ops managers (PurchaseOrderManager, DeliveryNoteManager,
// InvoiceManager) run in the same PPM UI internal staff already watch, so their status changes
// don't need pinging each other — but a COGES or cooperative contact works from the separate
// /partenaire-distribution portal and would otherwise never learn a document needs their action.
// These two helpers resolve that audience (by site for COGES, by cooperative for cooperative
// contacts) and fire one notification per active linked partner.
type NotifyOpsPartnersInput = { titleFr: string; titleEn: string; messageFr: string; messageEn: string; link: string };

export async function notifyOpsPartnersForSite(siteId: string, partnerType: "coges" | "cooperative", input: NotifyOpsPartnersInput) {
  const supabase = createClient();
  const { data } = await supabase.from("ppm_ops_partner_site_links")
    .select("ppm_ops_partner_profiles!inner(candidate_id, email, partner_type, status)")
    .eq("site_id", siteId).eq("ppm_ops_partner_profiles.partner_type", partnerType).eq("ppm_ops_partner_profiles.status", "active");
  const rows = (data || []) as unknown as { ppm_ops_partner_profiles: { candidate_id: string; email: string | null } }[];
  await Promise.all(rows.map(row => notifyPpmEventClient({
    recipient: { userId: row.ppm_ops_partner_profiles.candidate_id, email: row.ppm_ops_partner_profiles.email },
    category: "info", ...input,
  })));
}

export async function notifyOpsPartnersForCooperative(cooperativeId: string, input: NotifyOpsPartnersInput) {
  const supabase = createClient();
  const { data } = await supabase.from("ppm_ops_partner_profiles").select("candidate_id, email").eq("cooperative_id", cooperativeId).eq("status", "active");
  const rows = (data || []) as { candidate_id: string; email: string | null }[];
  await Promise.all(rows.map(row => notifyPpmEventClient({
    recipient: { userId: row.candidate_id, email: row.email },
    category: "info", ...input,
  })));
}
