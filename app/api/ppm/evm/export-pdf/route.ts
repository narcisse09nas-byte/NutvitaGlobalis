import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeEvm, resolveWorkPackageBac, rollupEvm } from "@/lib/ppm/evm";
import { renderEvmReport } from "@/lib/ppm/evm-pdf";
import {
  getApprovedPmbWorkPackageSnapshots, getEvmSettings, getProject, listActivities,
  listAchievements, listBudgetLines, listExpenses, listTimePhasedBudgets, listWbsNodes,
} from "@/lib/ppm/queries";
import { wbsLeafNodes } from "@/lib/ppm/wbs";

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

  const [workPackages, activities, achievements, expenses, budgetLines, timePhasedRows, pmbSnapshots] = await Promise.all([
    listWbsNodes(supabase, projectId), listActivities(supabase, projectId), listAchievements(supabase, projectId),
    listExpenses(supabase, projectId), listBudgetLines(supabase, projectId), listTimePhasedBudgets(supabase, projectId),
    getApprovedPmbWorkPackageSnapshots(supabase, projectId),
  ]);
  const workPackagesLevel4 = wbsLeafNodes(workPackages);
  const statusDate = settings.status_date;

  const wpMetrics = workPackagesLevel4.map(wp => {
    const wpActivities = activities.filter(activity => activity.work_package_id === wp.id);
    const activityIds = new Set(wpActivities.map(activity => activity.id));
    const wpExpenses = expenses.filter(item => item.work_package_id === wp.id || (item.activity_id && activityIds.has(item.activity_id)));
    const wpTimePhased = timePhasedRows.filter(row => row.work_package_id === wp.id);
    const { bac, source } = resolveWorkPackageBac(wp.id, budgetLines, pmbSnapshots);
    const metrics = computeEvm({ activities: wpActivities, achievements, expenses: wpExpenses, timePhasedRows: wpTimePhased, bac, bacSource: source, asOfDate: statusDate });
    return { title: wp.title, metrics };
  });
  const projectMetrics = rollupEvm(wpMetrics.map(item => item.metrics));

  const pdfBytes = await renderEvmReport({ projectName: project.name, statusDate, project: projectMetrics, workPackages: wpMetrics });
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="evm-${project.name.replace(/[^a-z0-9]+/gi, "-")}.pdf"` },
  });
}
