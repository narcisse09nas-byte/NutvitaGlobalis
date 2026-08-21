import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import MiseEnOeuvreTabs from "@/components/op-management/MiseEnOeuvreTabs";
import ProcurementPipeline from "@/components/op-management/ProcurementPipeline";
import { createClient } from "@/lib/supabase/server";
import { getProject, listProcurementItems, listWbsNodes } from "@/lib/ppm/queries";

export default async function MiseEnOeuvreProcurementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/mise-en-oeuvre/procurement`)}`);
  const name = user.user_metadata?.full_name || user.email || "Utilisateur";
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const [procurementItems, wbsNodes] = await Promise.all([listProcurementItems(supabase, id), listWbsNodes(supabase, id)]);

  return <PPMShell name={name} breadcrumbs={[{ href: "/op-management", label: "Vue d'ensemble" }, { href: "/op-management/projets", label: "Projets" }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/mise-en-oeuvre/procurement`, label: "Mise en oeuvre" }]}>
    <ProjectShell project={project}>
      <div className="grid gap-5">
        <MiseEnOeuvreTabs projectId={id} />
        <ProcurementPipeline projectId={id} initial={procurementItems} wbsNodes={wbsNodes} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
