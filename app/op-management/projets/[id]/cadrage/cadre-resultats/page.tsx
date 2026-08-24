import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import CadrageTabs from "@/components/op-management/CadrageTabs";
import ResultChainManager from "@/components/op-management/ResultChainManager";
import IndicatorManager from "@/components/op-management/IndicatorManager";
import HighLevelCalendar from "@/components/op-management/HighLevelCalendar";
import { createClient } from "@/lib/supabase/server";
import { getProject, listActivities, listIndicators, listResultChain } from "@/lib/ppm/queries";

export default async function CadrageResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/cadrage/cadre-resultats`)}`);
  const name = user.user_metadata?.full_name || user.email || "Utilisateur";
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const [resultChain, indicators, activities] = await Promise.all([listResultChain(supabase, id), listIndicators(supabase, id), listActivities(supabase, id)]);

  return <PPMShell name={name} breadcrumbs={[{ href: "/op-management", label: "Vue d'ensemble" }, { href: "/op-management/projets", label: "Projets" }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/cadrage/cadre-resultats`, label: "Cadrage" }]}>
    <ProjectShell project={project}>
      <div className="grid gap-8">
        <CadrageTabs projectId={id} />
        <ResultChainManager projectId={id} initial={resultChain} />
        <IndicatorManager projectId={id} initial={indicators} resultChain={resultChain} />
        <HighLevelCalendar activities={activities} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
