import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import MiseEnOeuvreTabs from "@/components/op-management/MiseEnOeuvreTabs";
import QualityManager from "@/components/op-management/QualityManager";
import { createClient } from "@/lib/supabase/server";
import { getProject, listNcrs, listQualityControlActuals, listQualityRequirements } from "@/lib/ppm/queries";

export default async function MiseEnOeuvreQualitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/mise-en-oeuvre/qualite`)}`);
  const name = user.user_metadata?.full_name || user.email || "Utilisateur";
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const [qualityRequirements, ncrs, actuals] = await Promise.all([
    listQualityRequirements(supabase, id), listNcrs(supabase, id), listQualityControlActuals(supabase, id),
  ]);

  return <PPMShell name={name} breadcrumbs={[{ href: "/op-management", label: "Vue d'ensemble" }, { href: "/op-management/projets", label: "Projets" }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/mise-en-oeuvre/qualite`, label: "Mise en oeuvre" }]}>
    <ProjectShell project={project}>
      <div className="grid gap-5">
        <MiseEnOeuvreTabs projectId={id} />
        <QualityManager projectId={id} initialRequirements={qualityRequirements} initialNcrs={ncrs} initialActuals={actuals} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
