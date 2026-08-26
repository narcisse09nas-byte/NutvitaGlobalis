import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import PlanificationTabs from "@/components/op-management/PlanificationTabs";
import PDMWorkspace from "@/components/op-management/PDMWorkspace";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import { getProject, listActivities, listIndicators, listResources, listResultChain, listSites, listWbsNodes } from "@/lib/ppm/queries";
import { wbsLeafNodes } from "@/lib/ppm/wbs";

export default async function PlanificationPdmPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/planification/pdm`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const [wbsNodes, resultChain, indicators, activities, staff, sites] = await Promise.all([
    listWbsNodes(supabase, id), listResultChain(supabase, id), listIndicators(supabase, id), listActivities(supabase, id), listResources(supabase, id), listSites(supabase, id),
  ]);
  const workPackages = wbsLeafNodes(wbsNodes);
  // Prefer nodes explicitly leveled "output", but fall back to the whole result chain when a
  // project's Impact->Outcome->Output hierarchy isn't fully built out yet (spec: le champ
  // "Output lie" ne doit jamais rester vide faute d'un niveau precis defini).
  const explicitOutputs = resultChain.filter(node => node.level === "output");
  const outputs = explicitOutputs.length ? explicitOutputs : resultChain;
  const locale = await getCurrentLocale();

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/projets", label: bc(locale, "projects") }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/planification/pdm`, label: bc(locale, "planning") }]}>
    <ProjectShell project={project}>
      <div className="grid gap-5">
        <PlanificationTabs projectId={id} />
        <PDMWorkspace projectId={id} initial={activities} workPackages={workPackages} outputs={outputs} indicators={indicators} staff={staff.filter(item => item.type === "human" || item.type === "consultant")} sites={sites} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
