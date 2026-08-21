import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeEvm, resolveWorkPackageBac, rollupEvm } from "@/lib/ppm/evm";
import type { EvmSettings } from "@/lib/ppm/types";

// EVM add-on (Wave 4): Vercel Cron hits this route on the schedule declared in vercel.json.
// Runs with no user session (createAdminClient/service role), so it is protected by a shared
// secret rather than RLS — set CRON_SECRET in the project's environment variables, matching
// Vercel's documented Cron authentication pattern.
function frequencyToDays(frequency: EvmSettings["reporting_frequency"]) {
  if (frequency === "weekly") return 7;
  if (frequency === "quarterly") return 90;
  return 30; // monthly, or unset — a sensible default cadence
}

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected && request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ message: "Non autorise." }, { status: 401 });
  }

  const service = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: settingsRows } = await service.from("ppm_evm_settings").select("*").eq("enabled", true);
  const settingsList = (settingsRows || []) as EvmSettings[];

  let processed = 0;
  let skipped = 0;

  for (const settings of settingsList) {
    const { data: lastSnapshot } = await service.from("ppm_evm_snapshots").select("status_date").eq("project_id", settings.project_id)
      .eq("scope", "project").order("status_date", { ascending: false }).limit(1).maybeSingle();
    if (lastSnapshot) {
      const daysSince = (+new Date(today) - +new Date(lastSnapshot.status_date)) / 86400000;
      if (daysSince < frequencyToDays(settings.reporting_frequency)) { skipped += 1; continue; }
    }

    const [{ data: workPackages }, { data: activities }, { data: achievements }, { data: expenses }, { data: budgetLines }, { data: timePhasedRows }, { data: pmbVersion }] = await Promise.all([
      service.from("ppm_wbs_nodes").select("*").eq("project_id", settings.project_id).eq("level", 4),
      service.from("ppm_activities").select("*").eq("project_id", settings.project_id),
      service.from("ppm_achievements").select("*").eq("project_id", settings.project_id),
      service.from("ppm_expenses").select("*").eq("project_id", settings.project_id),
      service.from("ppm_budget_lines").select("*").eq("project_id", settings.project_id),
      service.from("ppm_time_phased_budgets").select("*").eq("project_id", settings.project_id),
      service.from("ppm_pmb_versions").select("id").eq("project_id", settings.project_id).eq("status", "approved").maybeSingle(),
    ]);
    const { data: pmbSnapshotsData } = pmbVersion
      ? await service.from("ppm_pmb_work_package_snapshots").select("*").eq("pmb_version_id", pmbVersion.id)
      : { data: [] };
    const pmbSnapshots = pmbSnapshotsData || [];

    const wpMetrics = (workPackages || []).map(wp => {
      const wpActivities = (activities || []).filter(activity => activity.work_package_id === wp.id);
      const activityIds = new Set(wpActivities.map(activity => activity.id));
      const wpExpenses = (expenses || []).filter(item => item.work_package_id === wp.id || (item.activity_id && activityIds.has(item.activity_id)));
      const wpTimePhased = (timePhasedRows || []).filter(row => row.work_package_id === wp.id);
      const { bac, source } = resolveWorkPackageBac(wp.id, budgetLines || [], pmbSnapshots);
      return computeEvm({ activities: wpActivities, achievements: achievements || [], expenses: wpExpenses, timePhasedRows: wpTimePhased, bac, bacSource: source, asOfDate: settings.status_date || today });
    });
    const metrics = rollupEvm(wpMetrics);

    await service.from("ppm_evm_snapshots").insert({
      project_id: settings.project_id, scope: "project", scope_id: null, status_date: settings.status_date || today,
      bac: metrics.bac, pv: metrics.pv, ev: metrics.ev, ac: metrics.ac, sv: metrics.sv, cv: metrics.cv,
      spi: metrics.spi, cpi: metrics.cpi,
    });
    processed += 1;
  }

  return NextResponse.json({ ok: true, processed, skipped });
}
