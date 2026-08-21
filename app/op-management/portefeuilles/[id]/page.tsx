import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import PPMShell from "@/components/op-management/PPMShell";
import ProgramManager from "@/components/op-management/ProgramManager";
import ProjectManager from "@/components/op-management/ProjectManager";
import EntityStatusBadge from "@/components/op-management/EntityStatusBadge";
import RoleAssignmentManager from "@/components/op-management/RoleAssignmentManager";
import PortfolioProgramEvmRollup, { type ProjectEvmRow } from "@/components/op-management/PortfolioProgramEvmRollup";
import { createClient } from "@/lib/supabase/server";
import {
  getApprovedPmbWorkPackageSnapshots, getEvmSettings, getOrganization, getPortfolio,
  listAchievements, listActivities, listBudgetLines, listExpenses, listPortfolios, listPrograms,
  listProjects, listTimePhasedBudgets, listWbsNodes,
} from "@/lib/ppm/queries";
import { computeProjectEvm, rollupEvm } from "@/lib/ppm/evm";

export default async function PortfolioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/portefeuilles/${id}`)}`);
  const name = user.user_metadata?.full_name || user.email || "Utilisateur";
  const portfolio = await getPortfolio(supabase, id);
  if (!portfolio) notFound();
  const [organization, portfolios, programs, portfolioProjects] = await Promise.all([
    getOrganization(supabase, portfolio.organization_id),
    listPortfolios(supabase),
    listPrograms(supabase, id),
    listProjects(supabase, { portfolioId: id }),
  ]);
  const directProjects = portfolioProjects.filter(item => !item.program_id);

  const evmRows: ProjectEvmRow[] = [];
  let excludedCount = 0;
  const today = new Date().toISOString().slice(0, 10);
  await Promise.all(portfolioProjects.map(async childProject => {
    const settings = await getEvmSettings(supabase, childProject.id);
    if (!settings?.enabled) { excludedCount += 1; return; }
    const [workPackages, activities, achievements, expenses, budgetLines, timePhasedRows, pmbSnapshots] = await Promise.all([
      listWbsNodes(supabase, childProject.id), listActivities(supabase, childProject.id), listAchievements(supabase, childProject.id),
      listExpenses(supabase, childProject.id), listBudgetLines(supabase, childProject.id), listTimePhasedBudgets(supabase, childProject.id),
      getApprovedPmbWorkPackageSnapshots(supabase, childProject.id),
    ]);
    const metrics = computeProjectEvm({
      workPackages: workPackages.filter(node => node.level === 4), activities, achievements, expenses, budgetLines,
      timePhasedRows, pmbSnapshots, asOfDate: settings.status_date || today,
    });
    evmRows.push({ projectId: childProject.id, projectName: childProject.name, metrics });
  }));
  const evmRollup = evmRows.length ? rollupEvm(evmRows.map(row => row.metrics)) : null;

  return <PPMShell name={name} breadcrumbs={[{ href: "/op-management", label: "Vue d'ensemble" }, { href: "/op-management/portefeuilles", label: "Portefeuilles" }, { href: `/op-management/portefeuilles/${id}`, label: portfolio.name }]}>
    <div className="mb-7 flex flex-wrap items-start justify-between gap-3">
      <div>
        {organization && <Link href={`/op-management/organisations/${organization.id}`} className="text-xs font-black uppercase tracking-widest text-orange">{organization.name}</Link>}
        <h1 className="mt-1 text-3xl font-black text-forest">{portfolio.name}</h1>
        {portfolio.strategic_objectives && <p className="mt-2 max-w-2xl text-slate-500">{portfolio.strategic_objectives}</p>}
      </div>
      <EntityStatusBadge status={portfolio.status} />
    </div>
    <div className="mb-7 grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">Programmes</p><b className="mt-2 block text-2xl text-forest">{programs.length}</b></div>
      <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">Budget</p><b className="mt-2 block text-2xl text-forest">{portfolio.total_budget ? `${portfolio.total_budget.toLocaleString("fr-FR")} ${portfolio.currency || ""}` : "—"}</b></div>
      <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">Responsable</p><b className="mt-2 block text-2xl text-forest">{portfolio.manager_name || "—"}</b></div>
    </div>
    <ProgramManager initial={programs} portfolios={portfolios} portfolioId={id} />
    <div className="mt-6"><ProjectManager initial={directProjects} portfolios={portfolios} programs={[]} portfolioId={id} /></div>
    <div className="mt-6"><PortfolioProgramEvmRollup rollup={evmRollup} rows={evmRows} excludedCount={excludedCount} /></div>
    <div className="mt-6"><RoleAssignmentManager scopeType="portfolio" scopeId={id} scopeLabel={portfolio.name} /></div>
  </PPMShell>;
}
