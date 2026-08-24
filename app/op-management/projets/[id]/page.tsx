import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import AuditTrailFeed from "@/components/op-management/AuditTrailFeed";
import RoleAssignmentManager from "@/components/op-management/RoleAssignmentManager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import { getPortfolio, getProgram, getProject, listProjectHistory } from "@/lib/ppm/queries";

export default async function ProjectOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const locale = await getCurrentLocale();
  const en = locale === "en";
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const [portfolio, program, history] = await Promise.all([
    getPortfolio(supabase, project.portfolio_id),
    project.program_id ? getProgram(supabase, project.program_id) : Promise.resolve(null),
    listProjectHistory(supabase, id),
  ]);

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/projets", label: bc(locale, "projects") }, { href: `/op-management/projets/${id}`, label: project.name }]}>
    <ProjectShell project={project}>
      <div className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">{en ? "Progress" : "Progression"}</p><b className="mt-2 block text-2xl text-forest">{project.progress_percent != null ? `${project.progress_percent}%` : "—"}</b></div>
          <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">Budget</p><b className="mt-2 block text-2xl text-forest">{project.total_budget ? `${project.total_budget.toLocaleString("fr-FR")} ${project.currency || ""}` : "—"}</b></div>
          <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">{en ? "Project manager" : "Chef de projet"}</p><b className="mt-2 block text-lg text-forest">{project.project_manager_name || "—"}</b></div>
          <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">{en ? "Period" : "Periode"}</p><b className="mt-2 block text-lg text-forest">{project.start_date ? new Date(project.start_date).toLocaleDateString("fr-FR") : "—"} → {project.end_date ? new Date(project.end_date).toLocaleDateString("fr-FR") : "—"}</b></div>
        </div>

        <div className="rounded-2xl border bg-white p-6">
          <h2 className="text-lg font-black text-forest">{en ? "Attachment" : "Rattachement"}</h2>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            {portfolio && <Link href={`/op-management/portefeuilles/${portfolio.id}`} className="rounded-full bg-mint px-4 py-2 font-bold text-forest">{en ? "Portfolio" : "Portefeuille"} : {portfolio.name}</Link>}
            {program && <Link href={`/op-management/programmes/${program.id}`} className="rounded-full bg-mint px-4 py-2 font-bold text-forest">{en ? "Program" : "Programme"} : {program.name}</Link>}
            {!program && <span className="rounded-full bg-slate-100 px-4 py-2 font-bold text-slate-500">{en ? "Attached directly to the portfolio" : "Rattache directement au portefeuille"}</span>}
          </div>
        </div>

        {project.short_description && <div className="rounded-2xl border bg-white p-6"><h2 className="text-lg font-black text-forest">Description</h2><p className="mt-2 text-sm text-slate-600">{project.short_description}</p></div>}

        <div className="rounded-2xl border bg-white p-6">
          <h2 className="text-lg font-black text-forest">{bc(locale, "scoping")}</h2>
          <p className="mt-2 text-sm text-slate-500">{en ? "Identification, context, charter, requirements and scope of the project." : "Identification, contexte, charte, exigences et perimetre du projet."}</p>
          <Link href={`/op-management/projets/${id}/cadrage/identification`} className="btn-secondary mt-4 inline-flex">{en ? "Open scoping →" : "Ouvrir le cadrage →"}</Link>
        </div>

        <RoleAssignmentManager scopeType="project" scopeId={id} scopeLabel={project.name} />

        <AuditTrailFeed entries={history} currentUserId={user.id} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
