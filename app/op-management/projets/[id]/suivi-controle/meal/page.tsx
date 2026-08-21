import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import SuiviControleTabs from "@/components/op-management/SuiviControleTabs";
import IndicatorTrackingManager from "@/components/op-management/IndicatorTrackingManager";
import AccountabilityManager from "@/components/op-management/AccountabilityManager";
import { createClient } from "@/lib/supabase/server";
import { getProject, listEvaluations, listFeedbackEntries, listIndicators, listLessonsLearned, listMealEntries } from "@/lib/ppm/queries";

export default async function SuiviControleMealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/suivi-controle/meal`)}`);
  const name = user.user_metadata?.full_name || user.email || "Utilisateur";
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const [indicators, mealEntries, evaluations, feedbackEntries, lessonsLearned] = await Promise.all([
    listIndicators(supabase, id), listMealEntries(supabase, id), listEvaluations(supabase, id),
    listFeedbackEntries(supabase, id), listLessonsLearned(supabase, id),
  ]);

  return <PPMShell name={name} breadcrumbs={[{ href: "/op-management", label: "Vue d'ensemble" }, { href: "/op-management/projets", label: "Projets" }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/suivi-controle/meal`, label: "Suivi & controle" }]}>
    <ProjectShell project={project}>
      <div className="grid gap-8">
        <SuiviControleTabs projectId={id} />
        <IndicatorTrackingManager projectId={id} indicators={indicators} initialEntries={mealEntries} initialEvaluations={evaluations} />
        <AccountabilityManager projectId={id} initialFeedback={feedbackEntries} initialLessons={lessonsLearned} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
