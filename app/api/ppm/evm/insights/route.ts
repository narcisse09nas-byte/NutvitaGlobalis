import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateStructured } from "@/lib/ai-narrative";
import { computeEac, computeEtc, computeEvm, computeVac, evmStatusColor, rollupEvm } from "@/lib/ppm/evm";
import {
  getEvmSettings, getProject, listActivities, listAchievements, listBudgetLines, listExpenses,
  listTimePhasedBudgets, listWbsNodes,
} from "@/lib/ppm/queries";
import { wbsLeafNodes } from "@/lib/ppm/wbs";

// EVM add-on (Wave 1): the model only narrates SPI/CPI/EAC computed deterministically by
// lib/ppm/evm.ts — it never recalculates a metric itself (spec section 28).
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const projectId = String(body.project_id || "");
  if (!projectId) return NextResponse.json({ message: "Projet manquant." }, { status: 400 });

  const project = await getProject(supabase, projectId);
  if (!project) return NextResponse.json({ message: "Projet introuvable ou acces refuse." }, { status: 404 });

  const settings = await getEvmSettings(supabase, projectId);
  if (!settings?.enabled) return NextResponse.json({ message: "L'EVM n'est pas active pour ce projet." }, { status: 400 });

  const [workPackages, activities, achievements, expenses, budgetLines, timePhasedRows] = await Promise.all([
    listWbsNodes(supabase, projectId), listActivities(supabase, projectId), listAchievements(supabase, projectId),
    listExpenses(supabase, projectId), listBudgetLines(supabase, projectId), listTimePhasedBudgets(supabase, projectId),
  ]);
  const workPackagesLevel4 = wbsLeafNodes(workPackages);
  const statusDate = settings.status_date;

  const wpMetrics = workPackagesLevel4.map(wp => {
    const wpActivities = activities.filter(activity => activity.work_package_id === wp.id);
    const activityIds = new Set(wpActivities.map(activity => activity.id));
    const wpExpenses = expenses.filter(item => item.work_package_id === wp.id || (item.activity_id && activityIds.has(item.activity_id)));
    const wpTimePhased = timePhasedRows.filter(row => row.work_package_id === wp.id);
    const bac = budgetLines.filter(line => line.wbs_node_id === wp.id).reduce((sum, line) => sum + Number(line.revised_budget ?? line.initial_budget ?? 0), 0);
    const metrics = computeEvm({ activities: wpActivities, achievements, expenses: wpExpenses, timePhasedRows: wpTimePhased, bac, asOfDate: statusDate });
    return { title: wp.title, metrics };
  });
  const project_metrics = rollupEvm(wpMetrics.map(item => item.metrics));
  const eac = computeEac(project_metrics.bac, project_metrics.ac, project_metrics.ev, project_metrics.cpi, project_metrics.spi, "cpi");
  const etc = computeEtc(eac, project_metrics.ac);
  const vac = computeVac(project_metrics.bac, eac);

  const criticalWorkPackages = wpMetrics
    .filter(item => evmStatusColor(item.metrics.spi, settings.spi_threshold_green, settings.spi_threshold_orange) !== "green"
      || evmStatusColor(item.metrics.cpi, settings.cpi_threshold_green, settings.cpi_threshold_orange) !== "green")
    .map(item => ({ workPackage: item.title, spi: item.metrics.spi, cpi: item.metrics.cpi }));

  const metrics = {
    projectName: project.name,
    statusDate,
    bac: project_metrics.bac, pv: project_metrics.pv, ev: project_metrics.ev, ac: project_metrics.ac,
    sv: project_metrics.sv, cv: project_metrics.cv, spi: project_metrics.spi, cpi: project_metrics.cpi,
    eac, etc, vac,
    criticalWorkPackages,
  };

  const schema = {
    type: "object", additionalProperties: false,
    properties: { insight: { type: "string" } },
    required: ["insight"],
  };

  const result = await generateStructured<{ insight: string }>(
    "ppm_evm_insight",
    [
      "Vous commentez la performance Valeur Acquise (EVM) d'un projet pour un Project Manager.",
      "Utilisez uniquement les chiffres SPI/CPI/EAC/ETC/VAC fournis : ne recalculez jamais une metrique, ne l'inventez jamais.",
      "Rediger un paragraphe factuel en francais expliquant l'avance/retard (SPI), l'efficacite des couts (CPI), la prevision de cout final (EAC/VAC), et les Work Packages qui concentrent l'ecart.",
      "Terminer par 2-3 pistes d'investigation suggerees (Work Packages a approfondir, procurements a examiner, issues/risques a revoir) sans donner d'ordre, juste des suggestions.",
    ].join("\n"),
    metrics,
    schema,
  );

  if (!result.data) return NextResponse.json({ message: `Assistant IA indisponible (${result.error || "raison inconnue"}).` }, { status: 502 });
  return NextResponse.json({ ok: true, insight: result.data.insight });
}
