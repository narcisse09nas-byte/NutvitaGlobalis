import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import CadrageTabs from "@/components/op-management/CadrageTabs";
import ResultChainManager from "@/components/op-management/ResultChainManager";
import IndicatorManager from "@/components/op-management/IndicatorManager";
import HighLevelCalendar from "@/components/op-management/HighLevelCalendar";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import { getProject, listActivities, listIndicators, listKnownPeople, listResources, listResultChain, listWbsNodes } from "@/lib/ppm/queries";
import { wbsLeafNodes } from "@/lib/ppm/wbs";

export default async function CadrageResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/cadrage/cadre-resultats`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const locale = await getCurrentLocale();
  const [resultChain, indicators, activities, resources, wbsNodes, knownPeople] = await Promise.all([
    listResultChain(supabase, id), listIndicators(supabase, id), listActivities(supabase, id), listResources(supabase, id),
    listWbsNodes(supabase, id), listKnownPeople(supabase, project),
  ]);
  const staff = resources.filter(item => item.type === "human" || item.type === "consultant");
  const workPackages = wbsLeafNodes(wbsNodes);
  // Same "prefer explicit output-level nodes, else fall back to the whole chain" rule as the PDM
  // page, so "Output lie" is never empty for a project that hasn't fully built its Impact->
  // Outcome->Output hierarchy yet.
  const explicitOutputs = resultChain.filter(node => node.level === "output");
  const outputs = explicitOutputs.length ? explicitOutputs : resultChain;

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/projets", label: bc(locale, "projects") }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/cadrage/cadre-resultats`, label: bc(locale, "scoping") }]}>
    <ProjectShell project={project}>
      <div className="grid gap-8">
        <CadrageTabs projectId={id} />
        <ResultChainManager projectId={id} initial={resultChain} workPackages={workPackages} />
        <IndicatorManager projectId={id} initial={indicators} resultChain={resultChain} staff={staff} />
        <HighLevelCalendar projectId={id} initial={activities} workPackages={workPackages} outputs={outputs} indicators={indicators} knownPeople={knownPeople} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
