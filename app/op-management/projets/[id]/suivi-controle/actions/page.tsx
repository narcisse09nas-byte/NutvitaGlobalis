import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import SuiviControleTabs from "@/components/op-management/SuiviControleTabs";
import ActionTracker from "@/components/op-management/ActionTracker";
import { createClient } from "@/lib/supabase/server";
import { getProject, listActions } from "@/lib/ppm/queries";

export default async function SuiviControleActionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/suivi-controle/actions`)}`);
  const name = user.user_metadata?.full_name || user.email || "Utilisateur";
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const actions = await listActions(supabase, id);

  return <PPMShell name={name} breadcrumbs={[{ href: "/op-management", label: "Vue d'ensemble" }, { href: "/op-management/projets", label: "Projets" }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/suivi-controle/actions`, label: "Suivi & controle" }]}>
    <ProjectShell project={project}>
      <div className="grid gap-5">
        <SuiviControleTabs projectId={id} />
        <ActionTracker projectId={id} initial={actions} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
