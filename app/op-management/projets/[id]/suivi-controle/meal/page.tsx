import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import SuiviControleTabs from "@/components/op-management/SuiviControleTabs";
import IndicatorTrackingManager from "@/components/op-management/IndicatorTrackingManager";
import AccountabilityManager from "@/components/op-management/AccountabilityManager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import { getProject, listEvaluations, listFeedbackEntries, listFeedbackFollowups, listIndicators, listLessonsLearned, listMealEntries, listResources } from "@/lib/ppm/queries";

export default async function SuiviControleMealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/suivi-controle/meal`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const [indicators, mealEntries, evaluations, feedbackEntries, lessonsLearned, feedbackFollowups, resources] = await Promise.all([
    listIndicators(supabase, id), listMealEntries(supabase, id), listEvaluations(supabase, id),
    listFeedbackEntries(supabase, id), listLessonsLearned(supabase, id), listFeedbackFollowups(supabase, id), listResources(supabase, id),
  ]);
  const staff = resources.filter(item => item.type === "human" || item.type === "consultant");
  const locale = await getCurrentLocale();

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/projets", label: bc(locale, "projects") }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/suivi-controle/meal`, label: bc(locale, "monitoring") }]}>
    <ProjectShell project={project}>
      <div className="grid gap-8">
        <SuiviControleTabs projectId={id} />
        <IndicatorTrackingManager projectId={id} indicators={indicators} initialEntries={mealEntries} initialEvaluations={evaluations} staff={staff} />
        <AccountabilityManager projectId={id} initialFeedback={feedbackEntries} initialLessons={lessonsLearned} initialFollowups={feedbackFollowups} staff={staff} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
