import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderDailyMenuPlanReport } from "@/lib/ppm/ops-pdf";
import type { OpsDistributionPlanDaily, OpsDistributionPlanSite, OpsMenu, OpsSite } from "@/lib/ppm/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const planSiteId = String(body.plan_site_id || "");
  if (!planSiteId) return NextResponse.json({ message: "Ecole du plan manquante." }, { status: 400 });

  const { data: planSite } = await supabase.from("ppm_ops_distribution_plan_sites").select("*").eq("id", planSiteId).maybeSingle();
  if (!planSite) return NextResponse.json({ message: "Introuvable ou acces refuse." }, { status: 404 });
  const typedPlanSite = planSite as OpsDistributionPlanSite;

  const [{ data: site }, { data: dailyRows }] = await Promise.all([
    supabase.from("ppm_ops_sites").select("*").eq("id", typedPlanSite.site_id).maybeSingle(),
    supabase.from("ppm_ops_distribution_plan_daily").select("*").eq("plan_site_id", planSiteId).order("ration_date"),
  ]);
  const typedSite = site as OpsSite | null;
  const typedDaily = (dailyRows || []) as OpsDistributionPlanDaily[];
  const menuIds = Array.from(new Set(typedDaily.map(row => row.menu_id)));
  const { data: menus } = menuIds.length ? await supabase.from("ppm_ops_menus").select("*").in("id", menuIds) : { data: [] as OpsMenu[] };
  const typedMenus = (menus || []) as OpsMenu[];
  const menuName = (id: string) => typedMenus.find(item => item.id === id)?.name || "—";

  const pdfBytes = await renderDailyMenuPlanReport({
    siteName: typedSite?.name || "—",
    periodStart: typedPlanSite.period_start,
    periodEnd: typedPlanSite.period_end,
    days: typedDaily.map(row => ({ date: row.ration_date, menuName: menuName(row.menu_id), targetChildren: row.target_children })),
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="plan-journalier-${typedSite?.short_initials || planSiteId}.pdf"` },
  });
}
