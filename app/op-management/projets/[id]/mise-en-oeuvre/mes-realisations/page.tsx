import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import MiseEnOeuvreTabs from "@/components/op-management/MiseEnOeuvreTabs";
import MyAchievementsRegister from "@/components/op-management/MyAchievementsRegister";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import { getProject, listActivities, listIndicators, listMyAchievements, listResultChain, listWbsNodes } from "@/lib/ppm/queries";

export default async function MiseEnOeuvreMesRealisationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/mise-en-oeuvre/mes-realisations`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const [myAchievements, activities, wbsNodes, resultChain, indicators] = await Promise.all([
    listMyAchievements(supabase, id, user.id), listActivities(supabase, id), listWbsNodes(supabase, id),
    listResultChain(supabase, id), listIndicators(supabase, id),
  ]);
  const outputs = resultChain.filter(node => node.level === "output");
  const locale = await getCurrentLocale();

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/projets", label: bc(locale, "projects") }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/mise-en-oeuvre/mes-realisations`, label: bc(locale, "implementation") }]}>
    <ProjectShell project={project}>
      <div className="grid gap-5">
        <MiseEnOeuvreTabs projectId={id} />
        <MyAchievementsRegister projectId={id} initial={myAchievements} activities={activities} wbsNodes={wbsNodes} outputs={outputs} indicators={indicators} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
