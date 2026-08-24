import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import MiseEnOeuvreTabs from "@/components/op-management/MiseEnOeuvreTabs";
import MyActivitiesRegister from "@/components/op-management/MyActivitiesRegister";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import { getProject, listIndicators, listMyActivities, listResultChain, listWbsNodes } from "@/lib/ppm/queries";

export default async function MiseEnOeuvreMesActivitesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/mise-en-oeuvre/mes-activites`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const [myActivities, wbsNodes, resultChain, indicators] = await Promise.all([
    listMyActivities(supabase, id, user.email || ""), listWbsNodes(supabase, id), listResultChain(supabase, id), listIndicators(supabase, id),
  ]);
  const outputs = resultChain.filter(node => node.level === "output");
  const locale = await getCurrentLocale();

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/projets", label: bc(locale, "projects") }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/mise-en-oeuvre/mes-activites`, label: bc(locale, "implementation") }]}>
    <ProjectShell project={project}>
      <div className="grid gap-5">
        <MiseEnOeuvreTabs projectId={id} />
        <MyActivitiesRegister projectId={id} activities={myActivities} wbsNodes={wbsNodes} outputs={outputs} indicators={indicators} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
