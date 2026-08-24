import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectManager from "@/components/op-management/ProjectManager";
import EntityStatusBadge from "@/components/op-management/EntityStatusBadge";
import RoleAssignmentManager from "@/components/op-management/RoleAssignmentManager";
import PortfolioProgramEvmRollup, { type ProjectEvmRow } from "@/components/op-management/PortfolioProgramEvmRollup";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import {
  getApprovedPmbWorkPackageSnapshots, getEvmSettings, getPortfolio, getProgram, listAchievements,
  listActivities, listBudgetLines, listExpenses, listPortfolios, listPrograms, listProjects,
  listTimePhasedBudgets, listWbsNodes,
} from "@/lib/ppm/queries";
import { computeProjectEvm, rollupEvm } from "@/lib/ppm/evm";
import { wbsLeafNodes } from "@/lib/ppm/wbs";

export default async function ProgramDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/programmes/${id}`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const locale = await getCurrentLocale();
  const en = locale === "en";
  const program = await getProgram(supabase, id);
  if (!program) notFound();
  const [portfolio, portfolios, programs, projects] = await Promise.all([
    getPortfolio(supabase, program.portfolio_id),
    listPortfolios(supabase),
    listPrograms(supabase),
    listProjects(supabase, { programId: id }),
  ]);

  const evmRows: ProjectEvmRow[] = [];
  let excludedCount = 0;
  const today = new Date().toISOString().slice(0, 10);
  await Promise.all(projects.map(async childProject => {
    const settings = await getEvmSettings(supabase, childProject.id);
    if (!settings?.enabled) { excludedCount += 1; return; }
    const [workPackages, activities, achievements, expenses, budgetLines, timePhasedRows, pmbSnapshots] = await Promise.all([
      listWbsNodes(supabase, childProject.id), listActivities(supabase, childProject.id), listAchievements(supabase, childProject.id),
      listExpenses(supabase, childProject.id), listBudgetLines(supabase, childProject.id), listTimePhasedBudgets(supabase, childProject.id),
      getApprovedPmbWorkPackageSnapshots(supabase, childProject.id),
    ]);
    const metrics = computeProjectEvm({
      workPackages: wbsLeafNodes(workPackages), activities, achievements, expenses, budgetLines,
      timePhasedRows, pmbSnapshots, asOfDate: settings.status_date || today,
    });
    evmRows.push({ projectId: childProject.id, projectName: childProject.name, metrics });
  }));
  const evmRollup = evmRows.length ? rollupEvm(evmRows.map(row => row.metrics)) : null;

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/programmes", label: bc(locale, "programs") }, { href: `/op-management/programmes/${id}`, label: program.name }]}>
    <div className="mb-7 flex flex-wrap items-start justify-between gap-3">
      <div>
        {portfolio && <Link href={`/op-management/portefeuilles/${portfolio.id}`} className="text-xs font-black uppercase tracking-widest text-orange">{portfolio.name}</Link>}
        <h1 className="mt-1 text-3xl font-black text-forest">{program.name}</h1>
        {program.overall_objective && <p className="mt-2 max-w-2xl text-slate-500">{program.overall_objective}</p>}
      </div>
      <EntityStatusBadge status={program.status} />
    </div>
    <div className="mb-7 grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">Budget</p><b className="mt-2 block text-2xl text-forest">{program.budget ? `${program.budget.toLocaleString("fr-FR")} ${program.currency || ""}` : "—"}</b></div>
      <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">{en ? "Progress" : "Progression"}</p><b className="mt-2 block text-2xl text-forest">{program.progress_percent != null ? `${program.progress_percent}%` : "—"}</b></div>
      <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">{en ? "Manager" : "Responsable"}</p><b className="mt-2 block text-2xl text-forest">{program.manager_name || "—"}</b></div>
    </div>
    {(program.expected_results || program.target_population || program.intervention_area || program.donors?.length || program.partners?.length) && <div className="mb-7 grid gap-4 rounded-2xl border bg-white p-6 sm:grid-cols-2">
      {program.expected_results && <div className="sm:col-span-2"><p className="text-xs font-bold uppercase text-slate-400">{en ? "Expected results" : "Resultats attendus"}</p><p className="mt-1 text-sm text-slate-600">{program.expected_results}</p></div>}
      {program.target_population && <div><p className="text-xs font-bold uppercase text-slate-400">{en ? "Target population" : "Population cible"}</p><p className="mt-1 text-sm text-slate-600">{program.target_population}</p></div>}
      {program.intervention_area && <div><p className="text-xs font-bold uppercase text-slate-400">{en ? "Intervention area" : "Zone d'intervention"}</p><p className="mt-1 text-sm text-slate-600">{program.intervention_area}</p></div>}
      {!!program.donors?.length && <div><p className="text-xs font-bold uppercase text-slate-400">{en ? "Donors" : "Bailleurs"}</p><p className="mt-1 text-sm text-slate-600">{program.donors.join(", ")}</p></div>}
      {!!program.partners?.length && <div><p className="text-xs font-bold uppercase text-slate-400">{en ? "Partners" : "Partenaires"}</p><p className="mt-1 text-sm text-slate-600">{program.partners.join(", ")}</p></div>}
    </div>}
    <ProjectManager initial={projects} portfolios={portfolios} programs={programs} portfolioId={program.portfolio_id} programId={id} />
    <div className="mt-6"><PortfolioProgramEvmRollup rollup={evmRollup} rows={evmRows} excludedCount={excludedCount} /></div>
    <div className="mt-6"><RoleAssignmentManager scopeType="program" scopeId={id} scopeLabel={program.name} /></div>
  </PPMShell>;
}
